export enum TransactionType {
  TOPUP = "TOPUP",
  DONATION = "DONATION",
}

export enum TransactionStatus {
  PENDING = "PENDING",
  SETTLEMENT = "SETTLEMENT",
  COMPLETED = "COMPLETED",
  EXPIRE = "EXPIRE",
  FAILED = "FAILED",
  ONCHAIN_FAILED = "ONCHAIN_FAILED",
}

export interface TransactionResponse {
  id: string;
  order_id: string;
  type: TransactionType;
  campaign_id: string | null;
  amount: number;
  amount_eth: string | null;
  amount_wei: string | null;
  payment_type: string | null;
  payment_url: string | null;
  status: TransactionStatus;
  tx_hash: string | null;
  tx_url: string | null;
  transfer_tx_hash: string | null;
  transfer_tx_url: string | null;
  failure_reason: string | null;
  created_at: Date;
  updated_at: Date;
}
