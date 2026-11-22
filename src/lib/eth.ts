import { formatEther, parseEther } from "ethers";
import { config } from "../config/config";
import { HttpError } from "./http-error";

const WEI_PER_ETH = 10n ** 18n;

export function ethToWei(eth: string, field: string): bigint {
  const wei = parseEther(eth);

  if (wei <= 0n) {
    throw new HttpError(422, "Validation failed", [{ field, message: "Amount must be greater than 0" }]);
  }

  return wei;
}

export function weiToEth(wei: bigint | string): string {
  return formatEther(wei);
}

export function idrToWei(idr: bigint | number): bigint {
  return (BigInt(idr) * WEI_PER_ETH) / config.exchange.idrPerEth;
}

export function weiToIdr(wei: bigint | string): number {
  return Number((BigInt(wei) * config.exchange.idrPerEth) / WEI_PER_ETH);
}
