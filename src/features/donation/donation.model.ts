export interface DonateRequest {
  /**
   * @pattern ^\d+(\.\d{1,18})?$ Amount must be an ETH amount with at most 18 decimals
   * @example "0.01"
   */
  amount: string;
}

export interface DonationLimitResponse {
  wallet_address: string;
  balance_eth: string;
  pending_donations_eth: string;
  gas_fee_eth: string;
  remaining_target_eth: string;
  max_donation_eth: string;
  max_donation_wei: string;
}
