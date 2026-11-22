import { Body, Controller, Get, Path, Post, Request, Response, Route, Security, SuccessResponse, Tags } from "tsoa";
import { ApiResponse, ErrorResponse, successResponse } from "../../lib/response";
import { AuthRequest } from "../../middlewares/authentication";
import { TransactionResponse } from "../transaction/transaction.model";
import { DonateRequest, DonationLimitResponse } from "./donation.model";
import * as donationService from "./donation.service";

@Route("campaigns")
@Tags("Donation")
@Security("jwt")
@Response<ErrorResponse>(401, "Unauthorized")
@Response<ErrorResponse>(404, "Campaign not found")
@Response<ErrorResponse>(409, "Campaign not active")
export class DonationController extends Controller {
  @Get("{id}/donation-limit")
  public async getDonationLimit(
    @Path() id: string,
    @Request() request: AuthRequest,
  ): Promise<ApiResponse<DonationLimitResponse>> {
    const limit = await donationService.getDonationLimit(id, request.user.email);
    return successResponse("Donation limit retrieved successfully", limit);
  }

  @Post("{id}/donations")
  @SuccessResponse(201, "Created")
  @Response<ErrorResponse>(422, "Validation failed")
  @Response<ErrorResponse>(502, "Blockchain error")
  public async createDonation(
    @Path() id: string,
    @Body() body: DonateRequest,
    @Request() request: AuthRequest,
  ): Promise<ApiResponse<TransactionResponse>> {
    const transaction = await donationService.createDonation(id, body, request.user.email);
    this.setStatus(201);
    return successResponse("Donation submitted and is being processed", transaction);
  }
}
