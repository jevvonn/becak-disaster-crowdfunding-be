import express, {
  json,
  urlencoded,
  Response as ExResponse,
  Request as ExRequest,
} from "express";
import swaggerUi from "swagger-ui-express";
import { RegisterRoutes } from "../build/routes";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler";

export const app = express();

app.set("trust proxy", 1);
app.use(urlencoded({ extended: true }));
app.use(json());

const loadOpenApiSpec = async () =>
  (await import("../build/swagger.json")).default;

app.get("/docs/openapi.json", async (_req: ExRequest, res: ExResponse) => {
  res.json(await loadOpenApiSpec());
});

app.use("/docs", swaggerUi.serve, async (_req: ExRequest, res: ExResponse) => {
  res.send(swaggerUi.generateHTML(await loadOpenApiSpec()));
});

RegisterRoutes(app);

app.use(notFoundHandler);
app.use(errorHandler);
