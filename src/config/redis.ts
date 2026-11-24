import Redis from "ioredis";
import { config } from "./config";

let client: Redis | undefined;
let connected = true;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(config.redis.url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      commandTimeout: 1000,
    });

    client.on("ready", () => {
      connected = true;
      console.log("Redis connected");
    });

    client.on("error", (error) => {
      if (connected) {
        connected = false;
        console.error("Redis unavailable:", error.message);
      }
    });
  }

  return client;
}
