import rateLimit from "express-rate-limit";
import { errorResponse } from "../lib/response";

export function createRateLimiter(limit: number, windowMs: number) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, res) => {
      res
        .status(429)
        .json(errorResponse("Too many requests", `Rate limit of ${limit} requests per ${windowMs / 1000} seconds exceeded`));
    },
  });
}

export const publicRateLimiter = createRateLimiter(30, 60 * 1000);
