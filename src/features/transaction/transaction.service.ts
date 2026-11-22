import { Transaction } from "@prisma/client";
import { getExplorerTxUrl } from "../../config/blockchain";
import { prisma } from "../../config/prisma";
import { weiToEth } from "../../lib/eth";
import { HttpError } from "../../lib/http-error";
import { TransactionResponse, TransactionStatus, TransactionType } from "./transaction.model";

export function toTransactionResponse(transaction: Transaction): TransactionResponse {
  const amountWei = transaction.amountWei?.toFixed() ?? null;

  return {
    id: transaction.id,
    order_id: transaction.orderId,
    type: transaction.type as TransactionType,
    campaign_id: transaction.campaignId,
    amount: transaction.amount.toNumber(),
    amount_eth: amountWei === null ? null : weiToEth(amountWei),
    amount_wei: amountWei,
    payment_type: transaction.paymentType,
    payment_url: transaction.paymentUrl,
    status: transaction.status as TransactionStatus,
    tx_hash: transaction.txHashSepolia,
    tx_url: transaction.txHashSepolia ? getExplorerTxUrl(transaction.txHashSepolia) : null,
    failure_reason: transaction.failureReason,
    created_at: transaction.createdAt,
    updated_at: transaction.updatedAt,
  };
}

export async function getMyTransactions(email: string, type?: TransactionType): Promise<TransactionResponse[]> {
  const transactions = await prisma.transaction.findMany({
    where: { user: { email }, ...(type && { type }) },
    orderBy: { createdAt: "desc" },
  });

  return transactions.map(toTransactionResponse);
}

export async function getMyTransaction(id: string, email: string): Promise<TransactionResponse> {
  const transaction = await prisma.transaction.findFirst({ where: { id, user: { email } } });

  if (!transaction) {
    throw new HttpError(404, "Transaction not found", `No transaction found with id ${id}`);
  }

  return toTransactionResponse(transaction);
}
