export enum UserRole {
  DONOR = "DONOR",
  INITIATOR = "INITIATOR",
  ADMIN = "ADMIN",
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  wallet_address: string;
  created_at: Date;
  updated_at: Date;
}

export interface UpdateUserRoleRequest {
  /**
   * @example "INITIATOR"
   */
  role: UserRole;
}
