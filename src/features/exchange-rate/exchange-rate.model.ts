export enum ExchangeRateSource {
  COINGECKO = "coingecko",
  FALLBACK = "fallback",
}

export interface ExchangeRateResponse {
  pair: string;
  idr_per_eth: number;
  source: ExchangeRateSource;
  cached: boolean;
  fetched_at: string;
  expires_in_seconds: number;
}
