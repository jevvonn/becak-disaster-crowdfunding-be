import { config } from "../config/config";
import { getRedis } from "../config/redis";

const CACHE_KEY = "exchange-rate:eth:idr";
const CACHE_TTL_SECONDS = 12 * 60 * 60;
const FALLBACK_TTL_SECONDS = 5 * 60;
const COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price";

export type ExchangeRateSource = "coingecko" | "fallback";

export interface ExchangeRate {
  idrPerEth: bigint;
  source: ExchangeRateSource;
  fetchedAt: string;
  cached: boolean;
  expiresIn: number;
}

interface CachedRate {
  idrPerEth: string;
  source: ExchangeRateSource;
  fetchedAt: string;
}

let inFlight: Promise<ExchangeRate> | null = null;

async function readCache(): Promise<ExchangeRate | null> {
  try {
    const redis = getRedis();
    const [value, ttl] = await Promise.all([redis.get(CACHE_KEY), redis.ttl(CACHE_KEY)]);

    if (!value) {
      return null;
    }

    const cached = JSON.parse(value) as CachedRate;

    return {
      idrPerEth: BigInt(cached.idrPerEth),
      source: cached.source,
      fetchedAt: cached.fetchedAt,
      cached: true,
      expiresIn: Math.max(ttl, 0),
    };
  } catch {
    return null;
  }
}

async function writeCache(rate: CachedRate, ttl: number): Promise<void> {
  try {
    await getRedis().set(CACHE_KEY, JSON.stringify(rate), "EX", ttl);
  } catch {
    return;
  }
}

async function fetchFromCoinGecko(): Promise<bigint> {
  const params = new URLSearchParams({
    vs_currencies: "idr",
    ids: "ethereum",
    x_cg_demo_api_key: config.coinGecko.apiKey,
  });

  const response = await fetch(`${COINGECKO_URL}?${params}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`CoinGecko responded with HTTP ${response.status}`);
  }

  const body = (await response.json()) as { ethereum?: { idr?: unknown } };
  const idr = body.ethereum?.idr;

  if (typeof idr !== "number" || !Number.isFinite(idr) || idr <= 0) {
    throw new Error("CoinGecko response does not contain a valid ethereum.idr price");
  }

  return BigInt(Math.round(idr));
}

async function refreshRate(): Promise<ExchangeRate> {
  let rate: CachedRate;
  let ttl: number;

  try {
    rate = { idrPerEth: (await fetchFromCoinGecko()).toString(), source: "coingecko", fetchedAt: new Date().toISOString() };
    ttl = CACHE_TTL_SECONDS;
  } catch (error) {
    console.error("Failed to fetch ETH/IDR rate, using fallback:", (error as Error).message);
    rate = { idrPerEth: config.exchange.idrPerEth.toString(), source: "fallback", fetchedAt: new Date().toISOString() };
    ttl = FALLBACK_TTL_SECONDS;
  }

  await writeCache(rate, ttl);

  return { ...rate, idrPerEth: BigInt(rate.idrPerEth), cached: false, expiresIn: ttl };
}

export async function getExchangeRate(): Promise<ExchangeRate> {
  const cached = await readCache();

  if (cached) {
    return cached;
  }

  inFlight ??= refreshRate().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

export async function getIdrPerEth(): Promise<bigint> {
  return (await getExchangeRate()).idrPerEth;
}
