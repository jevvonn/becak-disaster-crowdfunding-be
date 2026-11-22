import { Request } from "express";
import { AuthUser } from "../features/auth/auth.model";
import { HttpError } from "../lib/http-error";
import { verifyToken } from "../lib/jwt";

export type AuthRequest = Request & { user: AuthUser };

export async function expressAuthentication(request: Request, securityName: string): Promise<AuthUser> {
  if (securityName !== "jwt") {
    throw new HttpError(401, "Unauthorized", `Unknown security scheme: ${securityName}`);
  }

  const [scheme, token] = request.headers.authorization?.split(" ") ?? [];

  if (scheme !== "Bearer" || !token) {
    throw new HttpError(401, "Unauthorized", "Missing or malformed Bearer token");
  }

  try {
    return verifyToken(token);
  } catch {
    throw new HttpError(401, "Unauthorized", "Invalid or expired token");
  }
}
