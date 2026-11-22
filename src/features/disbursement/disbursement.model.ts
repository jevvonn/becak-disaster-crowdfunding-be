export enum DisbursementStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  ONCHAIN_FAILED = "ONCHAIN_FAILED",
}

export interface CreateDisbursementRequest {
  /**
   * @example "3f1c2a9e-5b7d-4e8f-9a0b-1c2d3e4f5a6b"
   */
  campaign_id: string;
  /**
   * @pattern ^\d+(\.\d{1,18})?$ Amount must be an ETH amount with at most 18 decimals
   * @example "0.03"
   */
  amount: string;
  /**
   * @pattern ^(https?|ipfs):\/\/\S+$ Proof URL must be a valid http(s) or ipfs URL
   * @example "https://example.com/kwitansi-beras.jpg"
   */
  proof_url: string;
  /**
   * @maxLength 1000 Description must be at most 1000 characters
   * @example "Pembelian 500 kg beras untuk posko pengungsian"
   */
  description?: string;
}

export interface RejectDisbursementRequest {
  /**
   * @minLength 1 Rejection reason is required
   * @example "Bukti penyaluran tidak jelas"
   */
  reason: string;
}

export interface DisbursementLimitResponse {
  campaign_id: string;
  total_raised_eth: string;
  reserved_eth: string;
  available_eth: string;
  available_wei: string;
}

export interface DisbursementCampaign {
  id: string;
  onchain_id: number;
  title: string;
}

export interface DisbursementUser {
  id: string;
  name: string;
}

export interface DisbursementResponse {
  id: string;
  campaign: DisbursementCampaign;
  requested_by: DisbursementUser;
  reviewed_by: DisbursementUser | null;
  amount: number;
  amount_eth: string;
  amount_wei: string;
  description: string | null;
  proof_url: string;
  status: DisbursementStatus;
  rejection_reason: string | null;
  failure_reason: string | null;
  tx_hash: string | null;
  tx_url: string | null;
  transfer_tx_hash: string | null;
  transfer_tx_url: string | null;
  created_at: Date;
  updated_at: Date;
}
