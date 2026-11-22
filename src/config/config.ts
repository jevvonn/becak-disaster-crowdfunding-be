import "dotenv/config";

export const config = {
  app: {
    port: Number(process.env.APP_PORT) || 3000,
    url: process.env.APP_URL || "http://localhost:3000",
  },
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || "",
    password: process.env.DB_PASSWORD || "",
    name: process.env.DB_NAME || "",
    url: process.env.DB_URL || "",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "",
    expiresIn: process.env.JWT_EXPIRES_IN || "3h",
  },
  blockchain: {
    rpcUrl: process.env.SEPOLIA_RPC_URL || "",
    contractAddress: process.env.CONTRACT_ADDRESS || "",
    relayerPrivateKey: process.env.RELAYER_PRIVATE_KEY || "",
    walletEncryptionKey: process.env.WALLET_ENCRYPTION_KEY || "",
    explorerBaseUrl: process.env.EXPLORER_BASE_URL || "https://sepolia.etherscan.io",
  },
  midtrans: {
    serverKey: process.env.MIDTRANS_SERVER_KEY || "",
    clientKey: process.env.MIDTRANS_CLIENT_KEY || "",
    signatureKey: process.env.MIDTRANS_SIGNATURE_KEY || "",
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  },
  exchange: {
    idrPerEth: BigInt(process.env.IDR_PER_ETH || "10000000"),
  },
  defaultAdmin: {
    email: process.env.DEFAULT_ADMIN_EMAIL || "",
    password: process.env.DEFAULT_ADMIN_PASSWORD || "",
  },
};
