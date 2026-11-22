export interface WalletResponse {
  wallet_address: string;
  balance_eth: string;
  balance_wei: string;
  balance_idr: number;
  idr_per_eth: number;
}

export interface TopupRequest {
  /**
   * @isInt Amount must be an integer (Rupiah)
   * @minimum 10000 Minimum top up is Rp10.000
   * @maximum 100000000 Maximum top up is Rp100.000.000
   * @example 1000000
   */
  amount: number;
}
