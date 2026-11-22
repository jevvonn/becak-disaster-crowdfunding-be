import { Campaign, Prisma, User } from "@prisma/client";
import { getExplorerTxUrl } from "../../config/blockchain";
import { prisma } from "../../config/prisma";
import { ethToWei, weiToEth } from "../../lib/eth";
import { HttpError } from "../../lib/http-error";
import { closeCampaignOnChain, createCampaignOnChain, getCampaignOnChain } from "../../lib/relayer";
import { generateWallet } from "../../lib/wallet";
import {
  CampaignDetailResponse,
  CampaignResponse,
  CampaignStatus,
  CreateCampaignRequest,
  OnchainCampaign,
  PublicDisbursement,
  PublicDonation,
  RejectCampaignRequest,
  UpdateCampaignRequest,
} from "./campaign.model";

type CampaignWithInitiator = Campaign & { initiator: User };

const include = { initiator: true } as const;
const PUBLIC_STATUSES: CampaignStatus[] = [CampaignStatus.ACTIVE, CampaignStatus.COMPLETED];
const EDITABLE_STATUSES: CampaignStatus[] = [CampaignStatus.PENDING, CampaignStatus.REJECTED];

function toCampaignResponse(campaign: CampaignWithInitiator): CampaignResponse {
  return {
    id: campaign.id,
    onchain_id: Number(campaign.onchainId),
    title: campaign.title,
    description: campaign.description,
    image_url: campaign.imageUrl,
    target_amount: weiToEth(campaign.targetAmountWei.toFixed()),
    target_amount_wei: campaign.targetAmountWei.toFixed(),
    current_amount: weiToEth(campaign.currentAmountWei.toFixed()),
    current_amount_wei: campaign.currentAmountWei.toFixed(),
    campaign_wallet: campaign.campaignWallet,
    status: campaign.status as CampaignStatus,
    rejection_reason: campaign.rejectionReason,
    tx_hash_create: campaign.txHashCreate,
    tx_hash_close: campaign.txHashClose,
    initiator: {
      id: campaign.initiator.id,
      name: campaign.initiator.name,
      wallet_address: campaign.initiator.walletAddress,
    },
    created_at: campaign.createdAt,
    updated_at: campaign.updatedAt,
  };
}

async function findCampaign(id: string): Promise<CampaignWithInitiator> {
  const campaign = await prisma.campaign.findUnique({ where: { id }, include });

  if (!campaign) {
    throw new HttpError(404, "Campaign not found", `No campaign found with id ${id}`);
  }

  return campaign;
}

async function findOwnEditableCampaign(id: string, email: string): Promise<CampaignWithInitiator> {
  const campaign = await findCampaign(id);

  if (campaign.initiator.email !== email) {
    throw new HttpError(403, "Forbidden", "You can only manage your own campaigns");
  }

  if (!EDITABLE_STATUSES.includes(campaign.status as CampaignStatus)) {
    throw new HttpError(409, "Campaign is locked", `Campaign with status ${campaign.status} can no longer be changed`);
  }

  return campaign;
}

async function findPendingCampaign(id: string): Promise<CampaignWithInitiator> {
  const campaign = await findCampaign(id);

  if (campaign.status !== CampaignStatus.PENDING) {
    throw new HttpError(409, "Campaign is not pending", `Campaign with status ${campaign.status} cannot be reviewed`);
  }

  return campaign;
}

async function fetchOnchainCampaign(campaign: Campaign): Promise<OnchainCampaign | null> {
  try {
    const onchain = await getCampaignOnChain(campaign.onchainId);

    if (!onchain) {
      return null;
    }

    return {
      target_amount: weiToEth(onchain.targetAmount),
      total_raised: weiToEth(onchain.totalRaised),
      total_disbursed: weiToEth(onchain.totalDisbursed),
      available_balance: weiToEth(onchain.availableBalance),
      is_active: onchain.isActive,
      tx_url_create: campaign.txHashCreate ? getExplorerTxUrl(campaign.txHashCreate) : null,
    };
  } catch (error) {
    console.error("Failed to read campaign from chain", error);
    return null;
  }
}

export async function getPublicCampaigns(status?: CampaignStatus): Promise<CampaignResponse[]> {
  const statuses = status ? PUBLIC_STATUSES.filter((s) => s === status) : PUBLIC_STATUSES;

  const campaigns = await prisma.campaign.findMany({
    where: { status: { in: statuses } },
    include,
    orderBy: { createdAt: "desc" },
  });

  return campaigns.map(toCampaignResponse);
}

export async function getMyCampaigns(email: string): Promise<CampaignResponse[]> {
  const campaigns = await prisma.campaign.findMany({
    where: { initiator: { email } },
    include,
    orderBy: { createdAt: "desc" },
  });

  return campaigns.map(toCampaignResponse);
}

export async function getAllCampaigns(status?: CampaignStatus): Promise<CampaignResponse[]> {
  const campaigns = await prisma.campaign.findMany({
    where: status ? { status } : {},
    include,
    orderBy: { createdAt: "desc" },
  });

  return campaigns.map(toCampaignResponse);
}

async function findPublicCampaign(id: string): Promise<CampaignWithInitiator> {
  const campaign = await findCampaign(id);

  if (!PUBLIC_STATUSES.includes(campaign.status as CampaignStatus)) {
    throw new HttpError(404, "Campaign not found", `No campaign found with id ${id}`);
  }

  return campaign;
}

export async function getCampaign(id: string): Promise<CampaignDetailResponse> {
  const campaign = await findPublicCampaign(id);
  const onchain = await fetchOnchainCampaign(campaign);

  return { ...toCampaignResponse(campaign), onchain };
}

export async function getCampaignDisbursements(id: string): Promise<PublicDisbursement[]> {
  const campaign = await findPublicCampaign(id);
  return getPublicDisbursements(campaign.id);
}

export async function getCampaignDonaturs(id: string): Promise<PublicDonation[]> {
  const campaign = await findPublicCampaign(id);
  return getPublicDonations(campaign.id);
}

async function getPublicDisbursements(campaignId: string): Promise<PublicDisbursement[]> {
  const disbursements = await prisma.disbursement.findMany({
    where: { campaignId, status: "COMPLETED" },
    orderBy: { createdAt: "desc" },
  });

  return disbursements.map((disbursement) => {
    const amountWei = disbursement.amountWei?.toFixed() ?? "0";

    return {
      amount_eth: weiToEth(amountWei),
      amount_wei: amountWei,
      description: disbursement.description,
      proof_url: disbursement.proofUrl,
      tx_hash: disbursement.txHashSepolia,
      tx_url: disbursement.txHashSepolia ? getExplorerTxUrl(disbursement.txHashSepolia) : null,
      transfer_tx_hash: disbursement.transferTxHash,
      transfer_tx_url: disbursement.transferTxHash ? getExplorerTxUrl(disbursement.transferTxHash) : null,
      disbursed_at: disbursement.updatedAt,
    };
  });
}

export async function closeCampaign(id: string, email: string): Promise<CampaignResponse> {
  const campaign = await findCampaign(id);

  if (campaign.initiator.email !== email) {
    throw new HttpError(403, "Forbidden", "You can only manage your own campaigns");
  }

  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM campaigns WHERE id = ${id} FOR UPDATE`;

      const locked = await tx.campaign.findUniqueOrThrow({ where: { id } });

      if (locked.status !== CampaignStatus.ACTIVE) {
        throw new HttpError(409, "Campaign not active", `Campaign with status ${locked.status} cannot be closed`);
      }

      const [donationsInProgress, disbursementsInProgress, disbursed] = await Promise.all([
        tx.transaction.count({
          where: { campaignId: id, type: "DONATION", status: { in: ["PENDING", "SETTLEMENT"] } },
        }),
        tx.disbursement.count({ where: { campaignId: id, status: { in: ["PENDING", "APPROVED"] } } }),
        tx.disbursement.aggregate({
          where: { campaignId: id, status: { in: ["COMPLETED", "ONCHAIN_FAILED"] } },
          _sum: { amountWei: true },
        }),
      ]);

      if (donationsInProgress > 0 || disbursementsInProgress > 0) {
        throw new HttpError(
          409,
          "Campaign has transactions in progress",
          "Wait until all donations and disbursements are processed or reviewed before closing",
        );
      }

      const undisbursed = BigInt(locked.currentAmountWei.toFixed()) - BigInt(disbursed._sum.amountWei?.toFixed() ?? "0");

      if (undisbursed > 0n) {
        throw new HttpError(
          409,
          "Undisbursed funds remain",
          `${weiToEth(undisbursed)} ETH has not been disbursed yet. Disburse it before closing, the contract does not allow disbursements after a campaign is closed`,
        );
      }

      const { txHash } = await closeCampaignOnChain(locked.onchainId);

      return toCampaignResponse(
        await tx.campaign.update({
          where: { id },
          data: { status: CampaignStatus.COMPLETED, txHashClose: txHash },
          include,
        }),
      );
    },
    { timeout: 60000 },
  );
}

function anonymizeName(name: string): string {
  return `${name.trim().charAt(0).toUpperCase() || "*"}****`;
}

async function getPublicDonations(campaignId: string): Promise<PublicDonation[]> {
  const donations = await prisma.transaction.findMany({
    where: { campaignId, type: "DONATION", status: "COMPLETED" },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return donations.map((donation) => {
    const amountWei = donation.amountWei?.toFixed() ?? "0";

    return {
      donor_name: anonymizeName(donation.user.name),
      amount_eth: weiToEth(amountWei),
      amount_wei: amountWei,
      tx_hash: donation.txHashSepolia,
      tx_url: donation.txHashSepolia ? getExplorerTxUrl(donation.txHashSepolia) : null,
      transfer_tx_hash: donation.transferTxHash,
      transfer_tx_url: donation.transferTxHash ? getExplorerTxUrl(donation.transferTxHash) : null,
      donated_at: donation.createdAt,
    };
  });
}

export async function createCampaign(body: CreateCampaignRequest, email: string): Promise<CampaignResponse> {
  const initiator = await prisma.user.findUniqueOrThrow({ where: { email } });
  const wallet = generateWallet();

  const campaign = await prisma.campaign.create({
    data: {
      title: body.title.trim(),
      description: body.description.trim(),
      imageUrl: body.image_url,
      targetAmountWei: ethToWei(body.target_amount, "target_amount").toString(),
      campaignWallet: wallet.address,
      campaignWalletKeyEncrypted: wallet.privateKeyEncrypted,
      initiatorId: initiator.id,
    },
    include,
  });

  return toCampaignResponse(campaign);
}

export async function updateCampaign(
  id: string,
  body: UpdateCampaignRequest,
  email: string,
): Promise<CampaignResponse> {
  const campaign = await findOwnEditableCampaign(id, email);

  const data: Prisma.CampaignUpdateInput = {
    title: body.title?.trim(),
    description: body.description?.trim(),
    imageUrl: body.image_url,
    targetAmountWei:
      body.target_amount === undefined ? undefined : ethToWei(body.target_amount, "target_amount").toString(),
  };

  if (campaign.status === CampaignStatus.REJECTED) {
    data.status = CampaignStatus.PENDING;
    data.rejectionReason = null;
  }

  const updated = await prisma.campaign.update({ where: { id }, data, include });

  return toCampaignResponse(updated);
}

export async function deleteCampaign(id: string, email: string): Promise<void> {
  await findOwnEditableCampaign(id, email);
  await prisma.campaign.delete({ where: { id } });
}

export async function approveCampaign(id: string): Promise<CampaignResponse> {
  const campaign = await findPendingCampaign(id);

  let txHashCreate = campaign.txHashCreate;
  const onchain = await getCampaignOnChain(campaign.onchainId);

  if (onchain && onchain.campaignWallet.toLowerCase() !== campaign.campaignWallet.toLowerCase()) {
    throw new HttpError(
      409,
      "On-chain ID conflict",
      `On-chain campaign ${campaign.onchainId} is already registered to a different campaign`,
    );
  }

  if (!onchain) {
    const result = await createCampaignOnChain({
      campaignId: campaign.onchainId,
      title: campaign.title,
      initiatorWallet: campaign.initiator.walletAddress,
      campaignWallet: campaign.campaignWallet,
      targetAmount: BigInt(campaign.targetAmountWei.toFixed()),
    });
    txHashCreate = result.txHash;
  }

  const updated = await prisma.campaign.update({
    where: { id },
    data: { status: CampaignStatus.ACTIVE, rejectionReason: null, txHashCreate },
    include,
  });

  return toCampaignResponse(updated);
}

export async function rejectCampaign(id: string, { reason }: RejectCampaignRequest): Promise<CampaignResponse> {
  await findPendingCampaign(id);

  const updated = await prisma.campaign.update({
    where: { id },
    data: { status: CampaignStatus.REJECTED, rejectionReason: reason.trim() },
    include,
  });

  return toCampaignResponse(updated);
}
