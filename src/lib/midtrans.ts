import { createHash, timingSafeEqual } from "crypto";
import { config } from "../config/config";
import { HttpError } from "./http-error";

const BASE_URL = config.midtrans.isProduction ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";

function authorizationHeader(): string {
  return `Basic ${Buffer.from(`${config.midtrans.serverKey}:`).toString("base64")}`;
}

export interface CreatePaymentLinkParams {
  orderId: string;
  grossAmount: number;
  itemName: string;
  customerName: string;
  customerEmail: string;
  referenceId: string;
}

export interface PaymentLink {
  orderId: string;
  paymentUrl: string;
}

export async function createPaymentLink({
  orderId,
  grossAmount,
  itemName,
  customerName,
  customerEmail,
  referenceId,
}: CreatePaymentLinkParams): Promise<PaymentLink> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}/v1/payment-links`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: authorizationHeader(),
      },
      body: JSON.stringify({
        transaction_details: { order_id: orderId, gross_amount: grossAmount },
        usage_limit: 1,
        expiry: { duration: 1, unit: "days" },
        item_details: [{ id: "TOPUP", name: itemName.slice(0, 50), price: grossAmount, quantity: 1 }],
        customer_details: { first_name: customerName.slice(0, 50), email: customerEmail.slice(0, 50) },
        custom_field1: referenceId,
      }),
    });
  } catch (error) {
    throw new HttpError(502, "Payment gateway unreachable", (error as Error).message);
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const messages = body.error_messages ?? body.message ?? `HTTP ${response.status}`;
    throw new HttpError(502, "Payment gateway error", Array.isArray(messages) ? messages.join("; ") : String(messages));
  }

  return { orderId: body.order_id ?? orderId, paymentUrl: body.payment_url };
}

export interface MidtransSignaturePayload {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
}

export function verifyNotificationSignature({
  order_id,
  status_code,
  gross_amount,
  signature_key,
}: MidtransSignaturePayload): boolean {
  const signingKey = config.midtrans.signatureKey || config.midtrans.serverKey;
  const expected = createHash("sha512").update(`${order_id}${status_code}${gross_amount}${signingKey}`).digest("hex");

  const received = Buffer.from(String(signature_key).toLowerCase());
  const computed = Buffer.from(expected);

  return received.length === computed.length && timingSafeEqual(received, computed);
}
