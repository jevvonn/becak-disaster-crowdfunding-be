import { User } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { HttpError } from "../../lib/http-error";
import { signToken } from "../../lib/jwt";
import { hashPassword, verifyPassword } from "../../lib/password";
import { generateWallet } from "../../lib/wallet";
import { LoginRequest, LoginResponse, RegisterRequest, UserResponse } from "./auth.model";

function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    wallet_address: user.walletAddress,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  };
}

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

  const { token, expiresAt } = signToken(user);

  return { access_token: token, token_type: "Bearer", expires_at: expiresAt };
}

export async function getSession(email: string): Promise<UserResponse> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new HttpError(401, "Unauthorized", "User no longer exists");
  }

  return toUserResponse(user);
}
