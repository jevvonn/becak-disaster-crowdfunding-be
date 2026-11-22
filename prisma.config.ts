import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "database/schema.prisma",
  migrations: {
    path: "database/migrations",
    seed: "ts-node database/seed.ts",
  },
  datasource: {
    url: env("DB_URL"),
  },
});
