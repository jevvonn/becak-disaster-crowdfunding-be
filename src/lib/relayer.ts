import { Wallet } from "ethers";
import { getProvider, getReadContract, getRelayerContract, getRelayerSigner } from "../config/blockchain";
import { config } from "../config/config";
import { HttpError } from "./http-error";

const GAS_LIMIT_BUFFER_PERCENT = 20n;

let txQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = txQueue.then(task, task);
  txQueue = run.catch(() => undefined);
  return run;
}

function getErrorReason(error: unknown): string {
  const { reason, shortMessage, message } = (error ?? {}) as Record<string, string | undefined>;
  return reason || shortMessage || message || "Unknown blockchain error";
}

function isNonceError(error: unknown): boolean {
  const { code, message } = (error ?? {}) as Record<string, string | undefined>;
  const text = String(message).toLowerCase();
  return code === "NONCE_EXPIRED" || text.includes("nonce too low") || text.includes("already known");
}

async function assertContractDeployed(): Promise<void> {
  const { contractAddress } = config.blockchain;
  const code = await getProvider().getCode(contractAddress);

  if (code === "0x") {
    throw new HttpError(
      503,
      "Smart contract not deployed",
      `No contract found at ${contractAddress} on the configured RPC. Deploy the contract or update CONTRACT_ADDRESS.`,
    );
  }
}

async function sendTransaction(method: string, args: unknown[]) {
  return enqueue(async () => {
    try {
      await assertContractDeployed();
      const fn = getRelayerContract().getFunction(method);
      const estimatedGas = await fn.estimateGas(...args);
      const gasLimit = (estimatedGas * (100n + GAS_LIMIT_BUFFER_PERCENT)) / 100n;
      const tx = await fn(...args, { gasLimit });
      const receipt = await tx.wait();

      if (!receipt || receipt.status !== 1) {
        throw new Error(`Transaction ${method} reverted`);
      }

      return { txHash: receipt.hash as string, blockNumber: receipt.blockNumber as number };
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      if (isNonceError(error)) {
        getRelayerSigner().reset();
      }
      throw new HttpError(502, "Blockchain transaction failed", getErrorReason(error));
    }
  });
}

export async function sendEth(to: string, valueWei: bigint) {
  return enqueue(async () => {
    try {
      const signer = getRelayerSigner();
      const balance = await getProvider().getBalance(await signer.getAddress());

      if (balance < valueWei) {
        throw new HttpError(503, "Relayer balance insufficient", "Relayer wallet does not have enough ETH");
      }

      const tx = await signer.sendTransaction({ to, value: valueWei });
      const receipt = await tx.wait();

      if (!receipt || receipt.status !== 1) {
        throw new Error("ETH transfer reverted");
      }

      return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      if (isNonceError(error)) {
        getRelayerSigner().reset();
      }
      throw new HttpError(502, "ETH transfer failed", getErrorReason(error));
    }
  });
}

const TRANSFER_GAS_LIMIT = 21000n;
const walletQueues = new Map<string, Promise<unknown>>();

function enqueueForWallet<T>(address: string, task: () => Promise<T>): Promise<T> {
  const previous = walletQueues.get(address) ?? Promise.resolve();
  const run = previous.then(task, task);
  const settled = run.catch(() => undefined);
  walletQueues.set(address, settled);
  settled.then(() => {
    if (walletQueues.get(address) === settled) {
      walletQueues.delete(address);
    }
  });
  return run;
}

export async function getTransferGasFee(): Promise<bigint> {
  try {
    const feeData = await getProvider().getFeeData();
    const perGas = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n;
    return (TRANSFER_GAS_LIMIT * perGas * (100n + GAS_LIMIT_BUFFER_PERCENT)) / 100n;
  } catch (error) {
    throw new HttpError(502, "Blockchain read failed", getErrorReason(error));
  }
}

export function sendEthFromWallet(privateKey: string, to: string, valueWei: bigint, sponsorGas = false) {
  const wallet = new Wallet(privateKey, getProvider());

  return enqueueForWallet(wallet.address, async () => {
    if (sponsorGas) {
      const [gasFee, balance] = await Promise.all([getTransferGasFee(), getEthBalance(wallet.address)]);
      const shortfall = valueWei + gasFee - balance;

      if (shortfall > 0n) {
        await sendEth(wallet.address, shortfall);
      }
    }

    try {
      const tx = await wallet.sendTransaction({ to, value: valueWei, gasLimit: TRANSFER_GAS_LIMIT });
      const receipt = await tx.wait();

      if (!receipt || receipt.status !== 1) {
        throw new Error("ETH transfer reverted");
      }

      return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
    } catch (error) {
      throw new HttpError(502, "ETH transfer failed", getErrorReason(error));
    }
  });
}

export interface RecordDonationParams {
  campaignId: bigint;
  donorWallet: string;
  amountWei: bigint;
  orderId: string;
}

export function recordDonationOnChain({ campaignId, donorWallet, amountWei, orderId }: RecordDonationParams) {
  return sendTransaction("donateToCampaign", [campaignId, donorWallet, amountWei, orderId]);
}

export interface RecordDisbursementParams {
  campaignId: bigint;
  amountWei: bigint;
  proofUrl: string;
}

export function recordDisbursementOnChain({ campaignId, amountWei, proofUrl }: RecordDisbursementParams) {
  return sendTransaction("withdrawDisbursement", [campaignId, amountWei, proofUrl]);
}

export function closeCampaignOnChain(campaignId: bigint) {
  return sendTransaction("closeCampaign", [campaignId]);
}

export async function getEthBalance(address: string): Promise<bigint> {
  try {
    return await getProvider().getBalance(address);
  } catch (error) {
    throw new HttpError(502, "Blockchain read failed", getErrorReason(error));
  }
}

export interface CreateCampaignOnChainParams {
  campaignId: bigint;
  title: string;
  initiatorWallet: string;
  campaignWallet: string;
  targetAmount: bigint;
}

export function createCampaignOnChain({
  campaignId,
  title,
  initiatorWallet,
  campaignWallet,
  targetAmount,
}: CreateCampaignOnChainParams) {
  return sendTransaction("createCampaign", [campaignId, title, initiatorWallet, campaignWallet, targetAmount]);
}

export async function getCampaignOnChain(campaignId: bigint) {
  try {
    await assertContractDeployed();
    const contract = getReadContract();

    if (!(await contract.campaignExists(campaignId))) {
      return null;
    }

    const campaign = await contract.campaigns(campaignId);
    const totalRaised: bigint = campaign.totalRaised;
    const totalDisbursed: bigint = campaign.totalDisbursed;

    return {
      initiator: campaign.initiator as string,
      campaignWallet: campaign.campaignWallet as string,
      targetAmount: campaign.targetAmount as bigint,
      totalRaised,
      totalDisbursed,
      availableBalance: totalRaised - totalDisbursed,
      isActive: campaign.isActive as boolean,
    };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(502, "Blockchain read failed", getErrorReason(error));
  }
}
