import { User } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { HttpError } from "../../lib/http-error";
import { UpdateUserRoleRequest, UserResponse, UserRole } from "./user.model";

export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as UserRole,
    wallet_address: user.walletAddress,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  };
}

export async function getUsers(): Promise<UserResponse[]> {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });

  return users.map(toUserResponse);
}

export async function updateUserRole(
  id: string,
  { role }: UpdateUserRoleRequest,
  currentUserEmail: string,
): Promise<UserResponse> {
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    throw new HttpError(404, "User not found", `No user found with id ${id}`);
  }

  if (user.email === currentUserEmail) {
    throw new HttpError(400, "Cannot change own role", "Admins cannot change their own role");
  }

  const updated = await prisma.user.update({ where: { id }, data: { role } });

  return toUserResponse(updated);
}
