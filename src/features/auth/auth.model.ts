import { UserRole } from "../user/user.model";

export interface AuthUser {
  email: string;
  name: string;
  role: UserRole;
}

export interface RegisterRequest {
  /**
   * @minLength 1 Name is required
   * @maxLength 100 Name must be at most 100 characters
   * @example "John Doe"
   */
  name: string;
  /**
   * @pattern ^[^\s@]+@[^\s@]+\.[^\s@]+$ Email is invalid
   * @maxLength 100 Email must be at most 100 characters
   * @example "john.doe@gmail.com"
   */
  email: string;
  /**
   * @minLength 8 Password must be at least 8 characters
   * @example "password123"
   */
  password: string;
}

export interface LoginRequest {
  /**
   * @minLength 1 Email is required
   */
  email: string;
  /**
   * @minLength 1 Password is required
   */
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: "Bearer";
  expires_at: Date;
}
