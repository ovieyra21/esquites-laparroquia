// Vercel Serverless Function — Mercado Pago Webhook
// POST /api/mp-webhook
//
// Register this URL in your Mercado Pago dashboard:
// https://tu-dominio.vercel.app/api/mp-webhook

const MP_API = "https://api.mercadopago.com";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body;
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) {
      return res.status(500).json({ error: "MP not configured" });
    }

    // Only process payment notifications
    if (body.type !== "payment") {
      return res.status(200).json({ received: true, skipped: "not a payment" });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return res.status(200).json({ received: true, skipped: "no payment id" });
    }

    // Fetch payment details from Mercado Pago
    const mpRes = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!mpRes.ok) {
      console.error("MP payment fetch error:", mpRes.status);
      return res.status(502).json({ error: "Failed to fetch payment" });
    }

    const payment = await mpRes.json();
    const externalRef = payment.external_reference;

    if (!externalRef) {
      return res.status(200).json({ received: true, skipped: "no external_reference" });
    }

    // Update sale in Supabase
    const { createClient } = require("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error } = await supabase
      .from("sales")
      .update({
        payment_id: paymentId.toString(),
        payment_status: payment.status,
        payment_method: payment.payment_method_id,
        payment_details: {
          status_detail: payment.status_detail,
          transaction_amount: payment.transaction_amount,
          date_approved: payment.date_approved,
          payer_email: payment.payer?.email,
        },
      })
      .eq("id", externalRef);

    if (error) {
      console.error("Error updating sale:", error);
      return res.status(500).json({ error: "Database update failed" });
    }

    console.log(`✅ Payment ${paymentId} → sale ${externalRef}: ${payment.status}`);
    return res.status(200).json({
      received: true,
      processed: payment.status === "approved",
      status: payment.status,
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ error: err.message });
  }
}
