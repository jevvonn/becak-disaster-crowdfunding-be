import { formatEther, parseEther } from "ethers";
import { getIdrPerEth } from "./exchange-rate";
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

export async function idrToWei(idr: bigint | number): Promise<bigint> {
  return (BigInt(idr) * WEI_PER_ETH) / (await getIdrPerEth());
}

export async function weiToIdr(wei: bigint | string): Promise<number> {
  return Number((BigInt(wei) * (await getIdrPerEth())) / WEI_PER_ETH);
}
