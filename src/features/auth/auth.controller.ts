import { Body, Controller, Get, Post, Request, Response, Route, Security, SuccessResponse, Tags } from "tsoa";
import { ApiResponse, ErrorResponse, successResponse } from "../../lib/response";
import { AuthRequest } from "../../middlewares/authentication";
import { UserResponse } from "../user/user.model";
import { LoginRequest, LoginResponse, RegisterRequest } from "./auth.model";
import * as authService from "./auth.service";

@Route("auth")
@Tags("Auth")
export class AuthController extends Controller {
  @Post("register")
  @SuccessResponse(201, "Created")
  @Response<ErrorResponse>(409, "Email already registered")
  @Response<ErrorResponse>(422, "Validation failed")
  public async register(@Body() body: RegisterRequest): Promise<ApiResponse<UserResponse>> {
    const user = await authService.register(body);
    this.setStatus(201);
    return successResponse("User registered successfully", user);
  }

  @Post("login")
  @Response<ErrorResponse>(401, "Invalid credentials")
  @Response<ErrorResponse>(422, "Validation failed")
  public async login(@Body() body: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const result = await authService.login(body);
    return successResponse("Login successful", result);
  }

  @Get("session")
  @Security("jwt")
  @Response<ErrorResponse>(401, "Unauthorized")
  public async session(@Request() request: AuthRequest): Promise<ApiResponse<UserResponse>> {
    const user = await authService.getSession(request.user.email);
    return successResponse("Session retrieved successfully", user);
  }
}
