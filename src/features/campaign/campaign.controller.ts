import {
  Body,
  Controller,
  Delete,
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
import {
  ApiResponse,
  ErrorResponse,
  successResponse,
} from "../../lib/response";
import { AuthRequest } from "../../middlewares/authentication";
import { requireRole } from "../../middlewares/require-role";
import { UserRole } from "../user/user.model";
import {
  CampaignDetailResponse,
  CampaignResponse,
  CampaignStatus,
  CreateCampaignRequest,
  RejectCampaignRequest,
  UpdateCampaignRequest,
} from "./campaign.model";
import * as campaignService from "./campaign.service";

@Route("campaigns")
@Tags("Campaign")
export class CampaignController extends Controller {
  @Get()
  public async getCampaigns(
    @Query() status?: CampaignStatus,
  ): Promise<ApiResponse<CampaignResponse[]>> {
    const campaigns = await campaignService.getPublicCampaigns(status);
    return successResponse("Campaigns retrieved successfully", campaigns);
  }

  @Get("me")
  @Security("jwt")
  @Middlewares(requireRole(UserRole.INITIATOR))
  @Response<ErrorResponse>(401, "Unauthorized")
  @Response<ErrorResponse>(403, "Forbidden")
  public async getMyCampaigns(
    @Request() request: AuthRequest,
  ): Promise<ApiResponse<CampaignResponse[]>> {
    const campaigns = await campaignService.getMyCampaigns(request.user.email);
    return successResponse("Campaigns retrieved successfully", campaigns);
  }

  @Get("all")
  @Security("jwt")
  @Middlewares(requireRole(UserRole.ADMIN))
  @Response<ErrorResponse>(401, "Unauthorized")
  @Response<ErrorResponse>(403, "Forbidden")
  public async getAllCampaigns(
    @Query() status?: CampaignStatus,
  ): Promise<ApiResponse<CampaignResponse[]>> {
    const campaigns = await campaignService.getAllCampaigns(status);
    return successResponse("Campaigns retrieved successfully", campaigns);
  }

  @Get("{id}")
  @Response<ErrorResponse>(404, "Campaign not found")
  public async getCampaign(
    @Path() id: string,
  ): Promise<ApiResponse<CampaignDetailResponse>> {
    const campaign = await campaignService.getCampaign(id);
    return successResponse("Campaign retrieved successfully", campaign);
  }

  @Post()
  @Security("jwt")
  @Middlewares(requireRole(UserRole.INITIATOR))
  @SuccessResponse(201, "Created")
  @Response<ErrorResponse>(401, "Unauthorized")
  @Response<ErrorResponse>(403, "Forbidden")
  @Response<ErrorResponse>(422, "Validation failed")
  public async createCampaign(
    @Body() body: CreateCampaignRequest,
    @Request() request: AuthRequest,
  ): Promise<ApiResponse<CampaignResponse>> {
    const campaign = await campaignService.createCampaign(
      body,
      request.user.email,
    );
    this.setStatus(201);
    return successResponse("Campaign created successfully", campaign);
  }

  @Patch("{id}")
  @Security("jwt")
  @Middlewares(requireRole(UserRole.INITIATOR))
  @Response<ErrorResponse>(401, "Unauthorized")
  @Response<ErrorResponse>(403, "Forbidden")
  @Response<ErrorResponse>(404, "Campaign not found")
  @Response<ErrorResponse>(409, "Campaign is locked")
  @Response<ErrorResponse>(422, "Validation failed")
  public async updateCampaign(
    @Path() id: string,
    @Body() body: UpdateCampaignRequest,
    @Request() request: AuthRequest,
  ): Promise<ApiResponse<CampaignResponse>> {
    const campaign = await campaignService.updateCampaign(
      id,
      body,
      request.user.email,
    );
    return successResponse("Campaign updated successfully", campaign);
  }

  @Delete("{id}")
  @Security("jwt")
  @Middlewares(requireRole(UserRole.INITIATOR))
  @Response<ErrorResponse>(401, "Unauthorized")
  @Response<ErrorResponse>(403, "Forbidden")
  @Response<ErrorResponse>(404, "Campaign not found")
  @Response<ErrorResponse>(409, "Campaign is locked")
  public async deleteCampaign(
    @Path() id: string,
    @Request() request: AuthRequest,
  ): Promise<ApiResponse<null>> {
    await campaignService.deleteCampaign(id, request.user.email);
    return successResponse("Campaign deleted successfully", null);
  }

  @Patch("{id}/approve")
  @Security("jwt")
  @Middlewares(requireRole(UserRole.ADMIN))
  @Response<ErrorResponse>(401, "Unauthorized")
  @Response<ErrorResponse>(403, "Forbidden")
  @Response<ErrorResponse>(404, "Campaign not found")
  @Response<ErrorResponse>(409, "Campaign is not pending")
  @Response<ErrorResponse>(502, "Blockchain transaction failed")
  public async approveCampaign(
    @Path() id: string,
  ): Promise<ApiResponse<CampaignResponse>> {
    const campaign = await campaignService.approveCampaign(id);
    return successResponse(
      "Campaign approved and registered on-chain",
      campaign,
    );
  }

  @Patch("{id}/reject")
  @Security("jwt")
  @Middlewares(requireRole(UserRole.ADMIN))
  @Response<ErrorResponse>(401, "Unauthorized")
  @Response<ErrorResponse>(403, "Forbidden")
  @Response<ErrorResponse>(404, "Campaign not found")
  @Response<ErrorResponse>(409, "Campaign is not pending")
  @Response<ErrorResponse>(422, "Validation failed")
  public async rejectCampaign(
    @Path() id: string,
    @Body() body: RejectCampaignRequest,
  ): Promise<ApiResponse<CampaignResponse>> {
    const campaign = await campaignService.rejectCampaign(id, body);
    return successResponse("Campaign rejected", campaign);
  }
}
