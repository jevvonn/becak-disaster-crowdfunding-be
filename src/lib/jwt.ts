import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { config } from "../config/config";
import { AuthUser } from "../features/auth/auth.model";

export function signToken({ email, name, role }: AuthUser) {
  const token = jwt.sign({ email, name, role }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as SignOptions["expiresIn"],
  });
  const { exp } = jwt.decode(token) as JwtPayload;

  return { token, expiresAt: new Date((exp ?? 0) * 1000) };
}

export function verifyToken(token: string): AuthUser {
  const { email, name, role } = jwt.verify(token, config.jwt.secret) as JwtPayload & AuthUser;

  return { email, name, role };
}
