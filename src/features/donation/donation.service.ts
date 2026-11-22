import { randomBytes } from "crypto";
import { Campaign, Prisma, User } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ethToWei, weiToEth, weiToIdr } from "../../lib/eth";
import { HttpError } from "../../lib/http-error";
import {
  getCampaignOnChain,
  getEthBalance,
  getTransferGasFee,
  recordDonationOnChain,
  sendEthFromWallet,
} from "../../lib/relayer";
import { decryptPrivateKey } from "../../lib/wallet";
import { CampaignStatus } from "../campaign/campaign.model";
import { TransactionResponse, TransactionStatus, TransactionType } from "../transaction/transaction.model";
import { toTransactionResponse } from "../transaction/transaction.service";
import { DonateRequest, DonationLimitResponse } from "./donation.model";

type DbClient = Prisma.TransactionClient | typeof prisma;

const COUNTED_STATUSES = [
  TransactionStatus.PENDING,
  TransactionStatus.SETTLEMENT,
  TransactionStatus.COMPLETED,
  TransactionStatus.ONCHAIN_FAILED,
];

interface DonationLimit {
  balance: bigint;
  pendingDonations: bigint;
  gasFee: bigint;
  remainingTarget: bigint;
  maxByBalance: bigint;
  maxDonation: bigint;
}

const max = (a: bigint, b: bigint) => (a > b ? a : b);
const min = (a: bigint, b: bigint) => (a < b ? a : b);

function sumWei(result: { _sum: { amountWei: Prisma.Decimal | null } }): bigint {
  return BigInt(result._sum.amountWei?.toFixed() ?? "0");
}

async function findDonor(email: string): Promise<User> {
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });

  if (!user.privateKeyEncrypted) {
    throw new HttpError(409, "Wallet unavailable", "Your wallet cannot sign transactions");
  }

  return user;
}

async function findActiveCampaign(id: string): Promise<Campaign> {
  const campaign = await prisma.campaign.findUnique({ where: { id } });

  if (!campaign) {
    throw new HttpError(404, "Campaign not found", `No campaign found with id ${id}`);
  }

  if (campaign.status !== CampaignStatus.ACTIVE) {
    throw new HttpError(409, "Campaign not active", `Campaign with status ${campaign.status} cannot receive donations`);
  }

  return campaign;
}

async function calculateLimit(db: DbClient, user: User, campaign: Campaign, gasFee: bigint): Promise<DonationLimit> {
  const [balance, pending, raised] = await Promise.all([
    getEthBalance(user.walletAddress),
    db.transaction.aggregate({
      where: { userId: user.id, type: TransactionType.DONATION, status: TransactionStatus.PENDING },
      _sum: { amountWei: true },
    }),
    db.transaction.aggregate({
      where: { campaignId: campaign.id, type: TransactionType.DONATION, status: { in: COUNTED_STATUSES } },
      _sum: { amountWei: true },
    }),
  ]);

  const pendingDonations = sumWei(pending);
  const remainingTarget = max(BigInt(campaign.targetAmountWei.toFixed()) - sumWei(raised), 0n);
  const maxByBalance = max(balance - pendingDonations - gasFee, 0n);

  return {
    balance,
    pendingDonations,
    gasFee,
    remainingTarget,
    maxByBalance,
    maxDonation: min(maxByBalance, remainingTarget),
  };
}

export async function getDonationLimit(campaignId: string, email: string): Promise<DonationLimitResponse> {
  const user = await findDonor(email);
  const campaign = await findActiveCampaign(campaignId);
  const limit = await calculateLimit(prisma, user, campaign, await getTransferGasFee());

  return {
    wallet_address: user.walletAddress,
    balance_eth: weiToEth(limit.balance),
    pending_donations_eth: weiToEth(limit.pendingDonations),
    gas_fee_eth: weiToEth(limit.gasFee),
    remaining_target_eth: weiToEth(limit.remainingTarget),
    max_donation_eth: weiToEth(limit.maxDonation),
    max_donation_wei: limit.maxDonation.toString(),
  };
}

export async function createDonation(
  campaignId: string,
  { amount }: DonateRequest,
  email: string,
): Promise<TransactionResponse> {
  const amountWei = ethToWei(amount, "amount");
  const user = await findDonor(email);
  const campaign = await findActiveCampaign(campaignId);
  const onchain = await getCampaignOnChain(campaign.onchainId);

  if (!onchain?.isActive) {
    throw new HttpError(409, "Campaign not active on-chain", "This campaign cannot receive donations on-chain");
  }

  const gasFee = await getTransferGasFee();

  const transaction = await prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${user.id} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM campaigns WHERE id = ${campaign.id} FOR UPDATE`;

      const limit = await calculateLimit(tx, user, campaign, gasFee);

      if (limit.remainingTarget === 0n) {
        throw new HttpError(409, "Campaign target reached", "This campaign has already reached its target");
      }

      if (amountWei > limit.remainingTarget) {
        throw new HttpError(422, "Validation failed", [
          { field: "amount", message: `Amount exceeds the remaining target of ${weiToEth(limit.remainingTarget)} ETH` },
        ]);
      }

      if (amountWei > limit.maxByBalance) {
        throw new HttpError(422, "Validation failed", [
          {
            field: "amount",
            message: `Insufficient balance, you can donate at most ${weiToEth(limit.maxByBalance)} ETH after gas fee`,
          },
        ]);
      }

      return tx.transaction.create({
        data: {
          orderId: `DON-${randomBytes(12).toString("hex")}`,
          type: TransactionType.DONATION,
          userId: user.id,
          campaignId: campaign.id,
          amount: weiToIdr(amountWei),
          amountWei: amountWei.toString(),
          paymentType: "ETH_WALLET",
        },
      });
    },
    { timeout: 15000 },
  );

  processDonation(transaction.id).catch((error) => console.error("Failed to process donation", error));

  return toTransactionResponse(transaction);
}

function describeError(error: unknown): string {
  return error instanceof HttpError ? `${error.message}: ${error.errors}` : (error as Error).message;
}

async function processDonation(transactionId: string): Promise<void> {
  const transaction = await prisma.transaction.findUniqueOrThrow({
    where: { id: transactionId },
    include: { user: true, campaign: true },
  });
  const campaign = transaction.campaign as Campaign;
  const amountWei = BigInt(transaction.amountWei?.toFixed() ?? "0");

  let transferTxHash: string;

  try {
    const privateKey = decryptPrivateKey(transaction.user.privateKeyEncrypted);
    ({ txHash: transferTxHash } = await sendEthFromWallet(privateKey, campaign.campaignWallet, amountWei));
  } catch (error) {
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: TransactionStatus.FAILED, failureReason: describeError(error) },
    });
    return;
  }

  await prisma.transaction.update({
    where: { id: transactionId },
    data: { status: TransactionStatus.SETTLEMENT, transferTxHash },
  });

  try {
    const { txHash } = await recordDonationOnChain({
      campaignId: campaign.onchainId,
      donorWallet: transaction.user.walletAddress,
      amountWei,
      orderId: transaction.orderId,
    });

    await prisma.$transaction([
      prisma.transaction.update({
        where: { id: transactionId },
        data: { status: TransactionStatus.COMPLETED, txHashSepolia: txHash },
      }),
      prisma.campaign.update({
        where: { id: campaign.id },
        data: { currentAmountWei: { increment: amountWei.toString() } },
      }),
    ]);
  } catch (error) {
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: TransactionStatus.ONCHAIN_FAILED, failureReason: describeError(error) },
    });
  }
}
