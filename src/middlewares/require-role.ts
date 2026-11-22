import { RequestHandler } from "express";
import { prisma } from "../config/prisma";
import { UserRole } from "../features/user/user.model";
import { HttpError } from "../lib/http-error";
import { AuthRequest } from "./authentication";

export function requireRole(...roles: UserRole[]): RequestHandler {
  return async (req, _res, next) => {
    const { email } = (req as AuthRequest).user;
    const user = await prisma.user.findUnique({ where: { email }, select: { role: true } });

    if (!user) {
      throw new HttpError(401, "Unauthorized", "User no longer exists");
    }

    if (!roles.includes(user.role as UserRole)) {
      throw new HttpError(403, "Forbidden", "You do not have permission to access this resource");
    }

    next();
  };
}
