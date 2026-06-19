import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "./auth.functions";
import { getServerConfig } from "./config.server";
import { z } from "zod";

// ─── Mercado Pago API helpers ─────────────────────────────────────────

const MP_API = "https://api.mercadopago.com";

async function mpRequest(token: string, path: string, opts: RequestInit = {}) {
  const res = await fetch(`${MP_API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MercadoPago ${res.status}: ${body}`);
  }
  return res.json();
}

// ─── Create payment preference ────────────────────────────────────────

const createPreferenceSchema = z.object({
  externalReference: z.string(), // sale UUID
  title: z.string().min(1),
  amount: z.number().positive(),
  notificationUrl: z.string().optional(),
});

export type CreatePreferenceInput = z.infer<typeof createPreferenceSchema>;
export type CreatePreferenceResult = {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint: string;
  qrBase64: string;
};

export const createPaymentPreference = createServerFn({ method: "POST" })
  .validator(createPreferenceSchema)
  .handler(async ({ data, context }) => {
    await requireSupabaseAuth(context);
    const cfg = getServerConfig();
    const token = cfg.mercadopagoAccessToken;
    if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN no configurado");

    const { externalReference, title, amount, notificationUrl } = data;

    const preference = await mpRequest(token, "/checkout/preferences", {
      method: "POST",
      body: JSON.stringify({
        items: [
          {
            title,
            quantity: 1,
            unit_price: amount,
            currency_id: "MXN",
          },
        ],
        external_reference: externalReference,
        notification_url:
          notificationUrl ||
          "https://esquites-laparroquia.vercel.app/api/mp-webhook",
        back_urls: {
          success: "https://esquites-laparroquia.vercel.app/pos",
          pending: "https://esquites-laparroquia.vercel.app/pos",
          failure: "https://esquites-laparroquia.vercel.app/pos",
        },
        auto_return: "approved",
        statement_descriptor: "Esquites La Parroquia",
      }),
    });

    const initPoint = preference.init_point;
    const sandboxInitPoint = preference.sandbox_init_point;

    // Generate QR code from the init_point URL via a simple API
    let qrBase64 = "";
    try {
      const qrRes = await fetch(
        `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(initPoint)}`
      );
      if (qrRes.ok) {
        const buffer = await qrRes.arrayBuffer();
        qrBase64 = Buffer.from(buffer).toString("base64");
      }
    } catch {}

    return {
      preferenceId: preference.id,
      initPoint,
      sandboxInitPoint,
      qrBase64,
    };
  });

// ─── Check payment status ─────────────────────────────────────────────

const checkPaymentSchema = z.object({
  externalReference: z.string(),
});

export type CheckPaymentInput = z.infer<typeof checkPaymentSchema>;
export type CheckPaymentResult = {
  found: boolean;
  paid: boolean;
  paymentId?: string;
  status?: string;
  statusDetail?: string;
  amount?: number;
  paymentMethod?: string;
};

export const checkPaymentStatus = createServerFn({ method: "GET" })
  .validator(checkPaymentSchema)
  .handler(async ({ data, context }) => {
    await requireSupabaseAuth(context);
    const cfg = getServerConfig();
    const token = cfg.mercadopagoAccessToken;
    if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN no configurado");

    const { externalReference } = data;

    const result = await mpRequest(
      token,
      `/v1/payments/search?external_reference=${encodeURIComponent(externalReference)}&sort=date_created&criteria=desc&limit=5`
    );

    const payment = result.results?.[0];

    if (!payment) return { found: false, paid: false };

    return {
      found: true,
      paid: payment.status === "approved",
      paymentId: payment.id?.toString(),
      status: payment.status,
      statusDetail: payment.status_detail,
      amount: payment.transaction_amount,
      paymentMethod: payment.payment_method_id,
    };
  });

// ─── Handle webhook notification ──────────────────────────────────────

const webhookSchema = z.object({
  action: z.string().optional(),
  api_version: z.string().optional(),
  data: z.object({
    id: z.string(), // payment ID from Mercado Pago
  }),
  date_created: z.string().optional(),
  id: z.number().optional(),
  live_mode: z.boolean().optional(),
  type: z.string().optional(),
  user_id: z.number().optional(),
});

export type WebhookPayload = z.infer<typeof webhookSchema>;

export const handleMercadoPagoWebhook = createServerFn({ method: "POST" })
  .validator(webhookSchema)
  .handler(async ({ data, context }) => {
    const cfg = getServerConfig();

    // Verify webhook is about a payment
    if (data.type !== "payment") {
      return { received: true, processed: false, reason: "not a payment notification" };
    }

    const paymentId = data.data.id;
    const token = cfg.mercadopagoAccessToken;
    if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN no configurado");

    // Fetch payment details from Mercado Pago
    const payment = await mpRequest(token, `/v1/payments/${paymentId}`);
    const externalRef = payment.external_reference;

    if (!externalRef) {
      return { received: true, processed: false, reason: "no external_reference" };
    }

    // Update the sale record
    const supabase = context.supabase;
    const { error } = await supabase
      .from("sales")
      .update({
        payment_id: paymentId,
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
      console.error("Error updating sale payment:", error);
      throw error;
    }

    return {
      received: true,
      processed: payment.status === "approved",
      status: payment.status,
      reference: externalRef,
    };
  });
