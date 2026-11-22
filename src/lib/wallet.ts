import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { Wallet } from "ethers";
import { config } from "../config/config";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const key = Buffer.from(config.blockchain.walletEncryptionKey, "hex");

  if (key.length !== 32) {
    throw new Error("WALLET_ENCRYPTION_KEY must be a 32-byte hex string");
  }

  return key;
}

export function encryptPrivateKey(privateKey: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(privateKey, "utf8"), cipher.final()]);

  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("hex")).join(":");
}

export function decryptPrivateKey(payload: string): string {
  const [iv, authTag, encrypted] = payload.split(":").map((part) => Buffer.from(part, "hex"));
  const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function generateWallet() {
  const wallet = Wallet.createRandom();

  return {
    address: wallet.address,
    privateKeyEncrypted: encryptPrivateKey(wallet.privateKey),
  };
}
