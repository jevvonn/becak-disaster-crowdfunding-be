import { Contract, JsonRpcProvider, NonceManager, Wallet } from "ethers";
import artifact from "../abi/DisasterCrowdfunding.json";
import { config } from "./config";

let provider: JsonRpcProvider | undefined;
let relayerSigner: NonceManager | undefined;

export function getProvider(): JsonRpcProvider {
  provider ??= new JsonRpcProvider(config.blockchain.rpcUrl);
  return provider;
}

export function getRelayerSigner(): NonceManager {
  relayerSigner ??= new NonceManager(new Wallet(config.blockchain.relayerPrivateKey, getProvider()));
  return relayerSigner;
}

export function getReadContract(): Contract {
  return new Contract(config.blockchain.contractAddress, artifact.abi, getProvider());
}

export function getRelayerContract(): Contract {
  return new Contract(config.blockchain.contractAddress, artifact.abi, getRelayerSigner());
}

export function getExplorerTxUrl(txHash: string): string {
  return `${config.blockchain.explorerBaseUrl.replace(/\/+$/, "")}/tx/${txHash}`;
}
