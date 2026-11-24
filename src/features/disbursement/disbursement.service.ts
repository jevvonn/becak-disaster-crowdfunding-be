import { Campaign, Disbursement, Prisma, User } from "@prisma/client";
import { getExplorerTxUrl } from "../../config/blockchain";
import { prisma } from "../../config/prisma";
import { ethToWei, weiToEth, weiToIdr } from "../../lib/eth";
import { HttpError } from "../../lib/http-error";
import { getCampaignOnChain, recordDisbursementOnChain, sendEthFromWallet } from "../../lib/relayer";
import { decryptPrivateKey } from "../../lib/wallet";
import { CampaignStatus } from "../campaign/campaign.model";
import {
  CreateDisbursementRequest,
  DisbursementLimitResponse,
  DisbursementResponse,
  DisbursementStatus,
  RejectDisbursementRequest,
} from "./disbursement.model";

type DbClient = Prisma.TransactionClient | typeof prisma;
type DisbursementWithRelations = Disbursement & { campaign: Campaign; requestedBy: User; reviewedBy: User | null };

const include = { campaign: true, requestedBy: true, reviewedBy: true } as const;

export const COUNTED_DISBURSEMENT_STATUSES = [
  DisbursementStatus.PENDING,
  DisbursementStatus.APPROVED,
  DisbursementStatus.COMPLETED,
  DisbursementStatus.ONCHAIN_FAILED,
];

function toDisbursementResponse(disbursement: DisbursementWithRelations): DisbursementResponse {
  const amountWei = disbursement.amountWei?.toFixed() ?? "0";

  return {
    id: disbursement.id,
    campaign: {
      id: disbursement.campaign.id,
      onchain_id: Number(disbursement.campaign.onchainId),
      title: disbursement.campaign.title,
    },
    requested_by: { id: disbursement.requestedBy.id, name: disbursement.requestedBy.name },
    reviewed_by: disbursement.reviewedBy ? { id: disbursement.reviewedBy.id, name: disbursement.reviewedBy.name } : null,
    amount: disbursement.amount.toNumber(),
    amount_eth: weiToEth(amountWei),
    amount_wei: amountWei,
    description: disbursement.description,
    proof_url: disbursement.proofUrl,
    status: disbursement.status as DisbursementStatus,
    rejection_reason: disbursement.rejectionReason,
    failure_reason: disbursement.failureReason,
    tx_hash: disbursement.txHashSepolia,
    tx_url: disbursement.txHashSepolia ? getExplorerTxUrl(disbursement.txHashSepolia) : null,
    transfer_tx_hash: disbursement.transferTxHash,
    transfer_tx_url: disbursement.transferTxHash ? getExplorerTxUrl(disbursement.transferTxHash) : null,
    created_at: disbursement.createdAt,
    updated_at: disbursement.updatedAt,
  };
}

function describeError(error: unknown): string {
  return error instanceof HttpError ? `${error.message}: ${error.errors}` : (error as Error).message;
}

async function calculateAvailable(db: DbClient, campaign: Campaign) {
  const reserved = await db.disbursement.aggregate({
    where: { campaignId: campaign.id, status: { in: COUNTED_DISBURSEMENT_STATUSES } },
    _sum: { amountWei: true },
  });

  const raised = BigInt(campaign.currentAmountWei.toFixed());
  const reservedWei = BigInt(reserved._sum.amountWei?.toFixed() ?? "0");
  const available = raised > reservedWei ? raised - reservedWei : 0n;

  return { raised, reserved: reservedWei, available };
}

async function findOwnActiveCampaign(campaignId: string, email: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, include: { initiator: true } });

  if (!campaign) {
    throw new HttpError(404, "Campaign not found", `No campaign found with id ${campaignId}`);
  }

  if (campaign.initiator.email !== email) {
    throw new HttpError(403, "Forbidden", "You can only manage your own campaigns");
  }

  if (campaign.status !== CampaignStatus.ACTIVE) {
    throw new HttpError(409, "Campaign not active", `Campaign with status ${campaign.status} cannot disburse funds`);
  }

  return campaign;
}

async function findDisbursement(id: string): Promise<DisbursementWithRelations> {
  const disbursement = await prisma.disbursement.findUnique({ where: { id }, include });

  if (!disbursement) {
    throw new HttpError(404, "Disbursement not found", `No disbursement found with id ${id}`);
  }

  return disbursement;
}

export async function getDisbursementLimit(campaignId: string, email: string): Promise<DisbursementLimitResponse> {
  const campaign = await findOwnActiveCampaign(campaignId, email);
  const { raised, reserved, available } = await calculateAvailable(prisma, campaign);

  return {
    campaign_id: campaign.id,
    total_raised_eth: weiToEth(raised),
    reserved_eth: weiToEth(reserved),
    available_eth: weiToEth(available),
    available_wei: available.toString(),
  };
}

export async function createDisbursement(body: CreateDisbursementRequest, email: string): Promise<DisbursementResponse> {
  const amountWei = ethToWei(body.amount, "amount");
  const campaign = await findOwnActiveCampaign(body.campaign_id, email);
  const onchain = await getCampaignOnChain(campaign.onchainId);

  if (!onchain?.isActive) {
    throw new HttpError(409, "Campaign not active on-chain", "This campaign cannot disburse funds on-chain");
  }

  const amountIdr = await weiToIdr(amountWei);

  const disbursement = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM campaigns WHERE id = ${campaign.id} FOR UPDATE`;

    const locked = await tx.campaign.findUniqueOrThrow({ where: { id: campaign.id } });

    if (locked.status !== CampaignStatus.ACTIVE) {
      throw new HttpError(409, "Campaign not active", `Campaign with status ${locked.status} cannot disburse funds`);
    }

    const { available } = await calculateAvailable(tx, locked);

    if (amountWei > available) {
      throw new HttpError(422, "Validation failed", [
        { field: "amount", message: `Amount exceeds the available balance of ${weiToEth(available)} ETH` },
      ]);
    }

    return tx.disbursement.create({
      data: {
        campaignId: campaign.id,
        requestedById: campaign.initiatorId,
        amount: amountIdr,
        amountWei: amountWei.toString(),
        description: body.description?.trim() || null,
        proofUrl: body.proof_url,
      },
      include,
    });
  });

  return toDisbursementResponse(disbursement);
}

export async function getMyDisbursements(email: string): Promise<DisbursementResponse[]> {
  const disbursements = await prisma.disbursement.findMany({
    where: { requestedBy: { email } },
    include,
    orderBy: { createdAt: "desc" },
  });

  return disbursements.map(toDisbursementResponse);
}

export async function getAllDisbursements(status?: DisbursementStatus): Promise<DisbursementResponse[]> {
  const disbursements = await prisma.disbursement.findMany({
    where: status ? { status } : {},
    include,
    orderBy: { createdAt: "desc" },
  });

  return disbursements.map(toDisbursementResponse);
}

export async function approveDisbursement(id: string, adminEmail: string): Promise<DisbursementResponse> {
  const { campaignId } = await findDisbursement(id);
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail } });

  const approved = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM campaigns WHERE id = ${campaignId} FOR UPDATE`;

    const disbursement = await tx.disbursement.findUniqueOrThrow({ where: { id }, include });

    if (disbursement.status !== DisbursementStatus.PENDING) {
      throw new HttpError(409, "Disbursement is not pending", `Disbursement with status ${disbursement.status} cannot be reviewed`);
    }

    if (disbursement.campaign.status !== CampaignStatus.ACTIVE) {
      throw new HttpError(409, "Campaign not active", `Campaign with status ${disbursement.campaign.status} cannot disburse funds`);
    }

    return tx.disbursement.update({
      where: { id },
      data: { status: DisbursementStatus.APPROVED, reviewedById: admin.id },
      include,
    });
  });

  processDisbursement(id).catch((error) => console.error("Failed to process disbursement", error));

  return toDisbursementResponse(approved);
}

export async function rejectDisbursement(
  id: string,
  { reason }: RejectDisbursementRequest,
  adminEmail: string,
): Promise<DisbursementResponse> {
  await findDisbursement(id);
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail } });

  const { count } = await prisma.disbursement.updateMany({
    where: { id, status: DisbursementStatus.PENDING },
    data: { status: DisbursementStatus.REJECTED, reviewedById: admin.id, rejectionReason: reason.trim() },
  });

  if (count === 0) {
    throw new HttpError(409, "Disbursement is not pending", "Only pending disbursements can be rejected");
  }

  return toDisbursementResponse(await findDisbursement(id));
}

async function processDisbursement(id: string): Promise<void> {
  const disbursement = await prisma.disbursement.findUniqueOrThrow({
    where: { id },
    include: { campaign: { include: { initiator: true } } },
  });
  const { campaign } = disbursement;
  const amountWei = BigInt(disbursement.amountWei?.toFixed() ?? "0");

  let transferTxHash: string;

  try {
    const campaignKey = decryptPrivateKey(campaign.campaignWalletKeyEncrypted);
    ({ txHash: transferTxHash } = await sendEthFromWallet(campaignKey, campaign.initiator.walletAddress, amountWei, true));
  } catch (error) {
    await prisma.disbursement.update({
      where: { id },
      data: { status: DisbursementStatus.FAILED, failureReason: describeError(error) },
    });
    return;
  }

  await prisma.disbursement.update({ where: { id }, data: { transferTxHash } });

  try {
    const { txHash } = await recordDisbursementOnChain({
      campaignId: campaign.onchainId,
      amountWei,
      proofUrl: disbursement.proofUrl,
    });

    await prisma.disbursement.update({
      where: { id },
      data: { status: DisbursementStatus.COMPLETED, txHashSepolia: txHash },
    });
  } catch (error) {
    await prisma.disbursement.update({
      where: { id },
      data: { status: DisbursementStatus.ONCHAIN_FAILED, failureReason: describeError(error) },
    });
  }
}
