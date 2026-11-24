import { Controller, Get, Middlewares, Response, Route, Tags } from "tsoa";
import { getExchangeRate } from "../../lib/exchange-rate";
import { ApiResponse, ErrorResponse, successResponse } from "../../lib/response";
import { publicRateLimiter } from "../../middlewares/rate-limit";
import { ExchangeRateResponse, ExchangeRateSource } from "./exchange-rate.model";

@Route("exchange-rate")
@Tags("Exchange Rate")
export class ExchangeRateController extends Controller {
  @Get()
  @Middlewares(publicRateLimiter)
  @Response<ErrorResponse>(429, "Too many requests")
  public async getExchangeRate(): Promise<ApiResponse<ExchangeRateResponse>> {
    const rate = await getExchangeRate();

    return successResponse("Exchange rate retrieved successfully", {
      pair: "ETH/IDR",
      idr_per_eth: Number(rate.idrPerEth),
      source: rate.source as ExchangeRateSource,
      cached: rate.cached,
      fetched_at: rate.fetchedAt,
      expires_in_seconds: rate.expiresIn,
    });
  }
}
