import { Transaction } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { HttpError } from "../../lib/http-error";
import { verifyNotificationSignature } from "../../lib/midtrans";
import { sendEth } from "../../lib/relayer";
import { TransactionStatus, TransactionType } from "../transaction/transaction.model";
import { MidtransNotification, NotificationResult } from "./payment.model";

type Outcome = "SUCCESS" | "FAILED" | "EXPIRED" | "PENDING";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORDER_ID_PATTERN = /^(TOPUP-[0-9a-f]{24})/i;

function resolveOutcome({ transaction_status, fraud_status }: MidtransNotification): Outcome {
  switch (transaction_status) {
    case "settlement":
      return "SUCCESS";
    case "capture":
      return !fraud_status || fraud_status === "accept" ? "SUCCESS" : "PENDING";
    case "deny":
    case "cancel":
    case "failure":
      return "FAILED";
    case "expire":
      return "EXPIRED";
    default:
      return "PENDING";
  }
}

async function findTransaction(notification: MidtransNotification): Promise<Transaction | null> {
  if (notification.custom_field1 && UUID_PATTERN.test(notification.custom_field1)) {
    const byReference = await prisma.transaction.findUnique({ where: { id: notification.custom_field1 } });
    if (byReference) {
      return byReference;
    }
  }

  const orderId = ORDER_ID_PATTERN.exec(notification.order_id)?.[1] ?? notification.order_id;

  return prisma.transaction.findUnique({ where: { orderId } });
}

async function fulfillTopup(transactionId: string): Promise<void> {
  const transaction = await prisma.transaction.findUniqueOrThrow({
    where: { id: transactionId },
    include: { user: true },
  });

  try {
    const { txHash } = await sendEth(transaction.user.walletAddress, BigInt(transaction.amountWei?.toFixed() ?? "0"));

    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: TransactionStatus.COMPLETED, txHashSepolia: txHash },
    });
  } catch (error) {
    const reason = error instanceof HttpError ? `${error.message}: ${error.errors}` : (error as Error).message;

    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: TransactionStatus.ONCHAIN_FAILED, failureReason: reason },
    });
  }
}

export async function handleMidtransNotification(notification: MidtransNotification): Promise<NotificationResult> {
  if (!verifyNotificationSignature(notification)) {
    throw new HttpError(403, "Invalid signature", "Midtrans signature verification failed");
  }

  const transaction = await findTransaction(notification);

  if (!transaction) {
    throw new HttpError(404, "Transaction not found", `No transaction found for order ${notification.order_id}`);
  }

  if (Number(notification.gross_amount) !== transaction.amount.toNumber()) {
    throw new HttpError(400, "Amount mismatch", "Notification gross_amount does not match the transaction amount");
  }

  const outcome = resolveOutcome(notification);
  const where = { id: transaction.id, status: TransactionStatus.PENDING };

  if (outcome === "SUCCESS") {
    const { count } = await prisma.transaction.updateMany({
      where,
      data: { status: TransactionStatus.SETTLEMENT, paymentType: notification.payment_type ?? null },
    });

    if (count === 1 && transaction.type === TransactionType.TOPUP) {
      fulfillTopup(transaction.id).catch((error) => console.error("Failed to fulfill top up", error));
    }
  }

  if (outcome === "FAILED" || outcome === "EXPIRED") {
    await prisma.transaction.updateMany({
      where,
      data: {
        status: outcome === "FAILED" ? TransactionStatus.FAILED : TransactionStatus.EXPIRE,
        paymentType: notification.payment_type ?? null,
        failureReason: `Midtrans status: ${notification.transaction_status}`,
      },
    });
  }

  return { order_id: transaction.orderId, status: notification.transaction_status };
}
