import { randomBytes } from "crypto";
import { config } from "../../config/config";
import { prisma } from "../../config/prisma";
import { idrToWei, weiToEth, weiToIdr } from "../../lib/eth";
import { HttpError } from "../../lib/http-error";
import { createPaymentLink } from "../../lib/midtrans";
import { getEthBalance } from "../../lib/relayer";
import { TransactionResponse, TransactionStatus, TransactionType } from "../transaction/transaction.model";
import { toTransactionResponse } from "../transaction/transaction.service";
import { TopupRequest, WalletResponse } from "./wallet.model";

export async function getWallet(email: string): Promise<WalletResponse> {
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const balanceWei = await getEthBalance(user.walletAddress);

  return {
    wallet_address: user.walletAddress,
    balance_eth: weiToEth(balanceWei),
    balance_wei: balanceWei.toString(),
    balance_idr: weiToIdr(balanceWei),
    idr_per_eth: Number(config.exchange.idrPerEth),
  };
}

export async function createTopup({ amount }: TopupRequest, email: string): Promise<TransactionResponse> {
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const amountWei = idrToWei(amount);

  const transaction = await prisma.transaction.create({
    data: {
      orderId: `TOPUP-${randomBytes(12).toString("hex")}`,
      type: TransactionType.TOPUP,
      userId: user.id,
      amount,
      amountWei: amountWei.toString(),
    },
  });

  try {
    const { paymentUrl } = await createPaymentLink({
      orderId: transaction.orderId,
      grossAmount: amount,
      itemName: `Top up ${weiToEth(amountWei)} ETH`,
      customerName: user.name,
      customerEmail: user.email,
      referenceId: transaction.id,
    });

    const updated = await prisma.transaction.update({ where: { id: transaction.id }, data: { paymentUrl } });

    return toTransactionResponse(updated);
  } catch (error) {
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: TransactionStatus.FAILED,
        failureReason: error instanceof HttpError ? String(error.errors) : (error as Error).message,
      },
    });
    throw error;
  }
}
