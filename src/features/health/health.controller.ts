import { Controller, Get, Route, Tags } from "tsoa";

interface HealthResponse {
  status: string;
  timestamp: string;
}

@Route("health")
@Tags("Health")
export class HealthController extends Controller {
  @Get()
  public async getHealth(): Promise<HealthResponse> {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
