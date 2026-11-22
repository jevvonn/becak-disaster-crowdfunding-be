import { Controller, Get, Route, Tags } from "tsoa";
import { ApiResponse, successResponse } from "../../lib/response";

interface HealthResponse {
  status: string;
  timestamp: Date;
}

@Route("health")
@Tags("Health")
export class HealthController extends Controller {
  @Get()
  public async getHealth(): Promise<ApiResponse<HealthResponse>> {
    return successResponse("Service is healthy", {
      status: "ok",
      timestamp: new Date(),
    });
  }
}
