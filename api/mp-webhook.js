// Vercel Serverless Function — Mercado Pago Webhook
// POST /api/mp-webhook

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

    if (body.type !== "payment") {
      return res.status(200).json({ received: true, skipped: "not a payment" });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return res.status(200).json({ received: true, skipped: "no payment id" });
    }

    const mpRes = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!mpRes.ok) {
      console.error("MP payment fetch error:", mpRes.status);
      return res.status(502).json({ error: "Failed to fetch payment" });
    }

    const payment = await mpRes.json();
    const externalRef = payment.external_reference;

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
