import "dotenv/config";

export const config = {
  app: {
    port: Number(process.env.APP_PORT) || 3000,
    url: process.env.APP_URL || "http://localhost:3000",
  },
};
