import { ApiErrors } from "./response";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors: ApiErrors = null,
  ) {
    super(message);
  }
}
