import { formatEther, parseEther } from "ethers";
import { HttpError } from "./http-error";

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
