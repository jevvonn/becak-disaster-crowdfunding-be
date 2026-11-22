import { Body, Controller, Get, Middlewares, Patch, Path, Request, Response, Route, Security, Tags } from "tsoa";
import { ApiResponse, ErrorResponse, successResponse } from "../../lib/response";
import { AuthRequest } from "../../middlewares/authentication";
import { requireRole } from "../../middlewares/require-role";
import { UpdateUserRoleRequest, UserResponse, UserRole } from "./user.model";
import * as userService from "./user.service";

@Route("users")
@Tags("User")
@Security("jwt")
@Middlewares(requireRole(UserRole.ADMIN))
@Response<ErrorResponse>(401, "Unauthorized")
@Response<ErrorResponse>(403, "Forbidden")
export class UserController extends Controller {
  @Get()
  public async getUsers(): Promise<ApiResponse<UserResponse[]>> {
    const users = await userService.getUsers();
    return successResponse("Users retrieved successfully", users);
  }

  @Patch("{id}/role")
  @Response<ErrorResponse>(400, "Cannot change own role")
  @Response<ErrorResponse>(404, "User not found")
  @Response<ErrorResponse>(422, "Validation failed")
  public async updateUserRole(
    @Path() id: string,
    @Body() body: UpdateUserRoleRequest,
    @Request() request: AuthRequest,
  ): Promise<ApiResponse<UserResponse>> {
    const user = await userService.updateUserRole(id, body, request.user.email);
    return successResponse("User role updated successfully", user);
  }
}
