import { Body, Controller, Post, Response, Route, Tags } from "tsoa";
import { ApiResponse, ErrorResponse, successResponse } from "../../lib/response";
import { MidtransNotification, NotificationResult } from "./payment.model";
import * as paymentService from "./payment.service";

@Route("payments")
@Tags("Payment")
export class PaymentController extends Controller {
  @Post("midtrans/notification")
  @Response<ErrorResponse>(400, "Amount mismatch")
  @Response<ErrorResponse>(403, "Invalid signature")
  @Response<ErrorResponse>(404, "Transaction not found")
  public async midtransNotification(
    @Body() body: MidtransNotification,
  ): Promise<ApiResponse<NotificationResult>> {
    const result = await paymentService.handleMidtransNotification(body);
    return successResponse("Notification processed", result);
  }
}
