import { prisma } from "../../config/prisma";
import { HttpError } from "../../lib/http-error";
import { signToken } from "../../lib/jwt";
import { hashPassword, verifyPassword } from "../../lib/password";
import { generateWallet } from "../../lib/wallet";
import { UserResponse, UserRole } from "../user/user.model";
import { toUserResponse } from "../user/user.service";
import { LoginRequest, LoginResponse, RegisterRequest } from "./auth.model";

export async function register({ name, email, password }: RegisterRequest): Promise<UserResponse> {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (existing) {
    throw new HttpError(409, "Email already registered", "A user with this email already exists");
  }

  const wallet = generateWallet();

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      password: await hashPassword(password),
      walletAddress: wallet.address,
      privateKeyEncrypted: wallet.privateKeyEncrypted,
    },
  });

  return toUserResponse(user);
}

export async function login({ email, password }: LoginRequest): Promise<LoginResponse> {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });

  if (!user || !(await verifyPassword(password, user.password))) {
    throw new HttpError(401, "Invalid credentials", "Email or password is incorrect");
  }

  const { token, expiresAt } = signToken({ email: user.email, name: user.name, role: user.role as UserRole });

  return { access_token: token, token_type: "Bearer", expires_at: expiresAt };
}

export async function getSession(email: string): Promise<UserResponse> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new HttpError(401, "Unauthorized", "User no longer exists");
  }

  return toUserResponse(user);
}
