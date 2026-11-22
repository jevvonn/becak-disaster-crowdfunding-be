import { Controller, Get, Path, Query, Request, Response, Route, Security, Tags } from "tsoa";
import { ApiResponse, ErrorResponse, successResponse } from "../../lib/response";
import { AuthRequest } from "../../middlewares/authentication";
import { TransactionResponse, TransactionType } from "./transaction.model";
import * as transactionService from "./transaction.service";

@Route("transactions")
@Tags("Transaction")
@Security("jwt")
@Response<ErrorResponse>(401, "Unauthorized")
export class TransactionController extends Controller {
  @Get("me")
  public async getMyTransactions(
    @Request() request: AuthRequest,
    @Query() type?: TransactionType,
  ): Promise<ApiResponse<TransactionResponse[]>> {
    const transactions = await transactionService.getMyTransactions(request.user.email, type);
    return successResponse("Transactions retrieved successfully", transactions);
  }

  @Get("{id}")
  @Response<ErrorResponse>(404, "Transaction not found")
  public async getMyTransaction(
    @Path() id: string,
    @Request() request: AuthRequest,
  ): Promise<ApiResponse<TransactionResponse>> {
    const transaction = await transactionService.getMyTransaction(id, request.user.email);
    return successResponse("Transaction retrieved successfully", transaction);
  }
}
