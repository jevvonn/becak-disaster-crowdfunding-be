export enum CampaignStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  REJECTED = "REJECTED",
  COMPLETED = "COMPLETED",
}

export interface CreateCampaignRequest {
  /**
   * @minLength 1 Title is required
   * @maxLength 150 Title must be at most 150 characters
   * @example "Bantuan Banjir Bandang Sumatera Barat"
   */
  title: string;
  /**
   * @minLength 1 Description is required
   * @example "Penggalangan dana untuk kebutuhan logistik korban banjir bandang."
   */
  description: string;
  /**
   * @pattern ^https?:\/\/\S+$ Image URL must be a valid http(s) URL
   * @example "https://example.com/banjir.jpg"
   */
  image_url: string;
  /**
   * @pattern ^\d+(\.\d{1,18})?$ Target amount must be an ETH amount with at most 18 decimals
   * @example "1.5"
   */
  target_amount: string;
}

export interface UpdateCampaignRequest {
  /**
   * @minLength 1 Title is required
   * @maxLength 150 Title must be at most 150 characters
   * @example "Bantuan Banjir Bandang Sumatera Barat"
   */
  title?: string;
  /**
   * @minLength 1 Description is required
   * @example "Penggalangan dana untuk kebutuhan logistik korban banjir bandang."
   */
  description?: string;
  /**
   * @pattern ^https?:\/\/\S+$ Image URL must be a valid http(s) URL
   * @example "https://example.com/banjir.jpg"
   */
  image_url?: string;
  /**
   * @pattern ^\d+(\.\d{1,18})?$ Target amount must be an ETH amount with at most 18 decimals
   * @example "2"
   */
  target_amount?: string;
}

export interface RejectCampaignRequest {
  /**
   * @minLength 1 Rejection reason is required
   * @example "Dokumen legalitas tidak lengkap"
   */
  reason: string;
}

export interface CampaignInitiator {
  id: string;
  name: string;
  wallet_address: string;
}

export interface CampaignResponse {
  id: string;
  onchain_id: number;
  title: string;
  description: string;
  image_url: string;
  target_amount: string;
  target_amount_wei: string;
  current_amount: string;
  current_amount_wei: string;
  campaign_wallet: string;
  status: CampaignStatus;
  rejection_reason: string | null;
  tx_hash_create: string | null;
  tx_hash_close: string | null;
  initiator: CampaignInitiator;
  created_at: Date;
  updated_at: Date;
}

export interface OnchainCampaign {
  target_amount: string;
  total_raised: string;
  total_disbursed: string;
  available_balance: string;
  is_active: boolean;
  tx_url_create: string | null;
}

export interface PublicDonation {
  donor_name: string;
  amount_eth: string;
  amount_wei: string;
  tx_hash: string | null;
  tx_url: string | null;
  transfer_tx_hash: string | null;
  transfer_tx_url: string | null;
  donated_at: Date;
}

export interface PublicDisbursement {
  amount_eth: string;
  amount_wei: string;
  description: string | null;
  proof_url: string;
  tx_hash: string | null;
  tx_url: string | null;
  transfer_tx_hash: string | null;
  transfer_tx_url: string | null;
  disbursed_at: Date;
}

export interface CampaignDetailResponse extends CampaignResponse {
  onchain: OnchainCampaign | null;
  donations: PublicDonation[];
  disbursements: PublicDisbursement[];
}
