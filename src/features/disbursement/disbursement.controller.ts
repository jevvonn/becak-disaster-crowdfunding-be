import {
  Body,
  Controller,
  Get,
  Middlewares,
  Patch,
  Path,
  Post,
  Query,
  Request,
  Response,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from "tsoa";
import { ApiResponse, ErrorResponse, successResponse } from "../../lib/response";
import { AuthRequest } from "../../middlewares/authentication";
import { requireRole } from "../../middlewares/require-role";
import { UserRole } from "../user/user.model";
import {
  CreateDisbursementRequest,
  DisbursementLimitResponse,
  DisbursementResponse,
  DisbursementStatus,
  RejectDisbursementRequest,
} from "./disbursement.model";
import * as disbursementService from "./disbursement.service";

@Route("disbursements")
@Tags("Disbursement")
@Security("jwt")
@Response<ErrorResponse>(401, "Unauthorized")
@Response<ErrorResponse>(403, "Forbidden")
export class DisbursementController extends Controller {
  @Get("me")
  @Middlewares(requireRole(UserRole.INITIATOR))
  public async getMyDisbursements(@Request() request: AuthRequest): Promise<ApiResponse<DisbursementResponse[]>> {
    const disbursements = await disbursementService.getMyDisbursements(request.user.email);
    return successResponse("Disbursements retrieved successfully", disbursements);
  }

  @Get("limit")
  @Middlewares(requireRole(UserRole.INITIATOR))
  @Response<ErrorResponse>(404, "Campaign not found")
  @Response<ErrorResponse>(409, "Campaign not active")
  public async getDisbursementLimit(
    @Query() campaign_id: string,
    @Request() request: AuthRequest,
  ): Promise<ApiResponse<DisbursementLimitResponse>> {
    const limit = await disbursementService.getDisbursementLimit(campaign_id, request.user.email);
    return successResponse("Disbursement limit retrieved successfully", limit);
  }

  @Get()
  @Middlewares(requireRole(UserRole.ADMIN))
  public async getAllDisbursements(
    @Query() status?: DisbursementStatus,
  ): Promise<ApiResponse<DisbursementResponse[]>> {
    const disbursements = await disbursementService.getAllDisbursements(status);
    return successResponse("Disbursements retrieved successfully", disbursements);
  }

  @Post()
  @Middlewares(requireRole(UserRole.INITIATOR))
  @SuccessResponse(201, "Created")
  @Response<ErrorResponse>(404, "Campaign not found")
  @Response<ErrorResponse>(409, "Campaign not active")
  @Response<ErrorResponse>(422, "Validation failed")
  public async createDisbursement(
    @Body() body: CreateDisbursementRequest,
    @Request() request: AuthRequest,
  ): Promise<ApiResponse<DisbursementResponse>> {
    const disbursement = await disbursementService.createDisbursement(body, request.user.email);
    this.setStatus(201);
    return successResponse("Disbursement requested, waiting for admin approval", disbursement);
  }

  @Patch("{id}/approve")
  @Middlewares(requireRole(UserRole.ADMIN))
  @Response<ErrorResponse>(404, "Disbursement not found")
  @Response<ErrorResponse>(409, "Disbursement is not pending")
  public async approveDisbursement(
    @Path() id: string,
    @Request() request: AuthRequest,
  ): Promise<ApiResponse<DisbursementResponse>> {
    const disbursement = await disbursementService.approveDisbursement(id, request.user.email);
    return successResponse("Disbursement approved and is being processed", disbursement);
  }

  @Patch("{id}/reject")
  @Middlewares(requireRole(UserRole.ADMIN))
  @Response<ErrorResponse>(404, "Disbursement not found")
  @Response<ErrorResponse>(409, "Disbursement is not pending")
  @Response<ErrorResponse>(422, "Validation failed")
  public async rejectDisbursement(
    @Path() id: string,
    @Body() body: RejectDisbursementRequest,
    @Request() request: AuthRequest,
  ): Promise<ApiResponse<DisbursementResponse>> {
    const disbursement = await disbursementService.rejectDisbursement(id, body, request.user.email);
    return successResponse("Disbursement rejected", disbursement);
  }
}
