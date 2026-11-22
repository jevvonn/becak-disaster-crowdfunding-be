import { Body, Controller, Get, Post, Request, Response, Route, Security, SuccessResponse, Tags } from "tsoa";
import { ApiResponse, ErrorResponse, successResponse } from "../../lib/response";
import { AuthRequest } from "../../middlewares/authentication";
import { TransactionResponse } from "../transaction/transaction.model";
import { TopupRequest, WalletResponse } from "./wallet.model";
import * as walletService from "./wallet.service";

@Route("wallet")
@Tags("Wallet")
@Security("jwt")
@Response<ErrorResponse>(401, "Unauthorized")
export class WalletController extends Controller {
  @Get()
  @Response<ErrorResponse>(502, "Blockchain read failed")
  public async getWallet(@Request() request: AuthRequest): Promise<ApiResponse<WalletResponse>> {
    const wallet = await walletService.getWallet(request.user.email);
    return successResponse("Wallet retrieved successfully", wallet);
  }

  @Post("topup")
  @SuccessResponse(201, "Created")
  @Response<ErrorResponse>(422, "Validation failed")
  @Response<ErrorResponse>(502, "Payment gateway error")
  public async createTopup(
    @Body() body: TopupRequest,
    @Request() request: AuthRequest,
  ): Promise<ApiResponse<TransactionResponse>> {
    const transaction = await walletService.createTopup(body, request.user.email);
    this.setStatus(201);
    return successResponse("Top up created, complete the payment via payment_url", transaction);
  }
}
