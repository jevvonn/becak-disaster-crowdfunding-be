import { NextFunction, Request, Response } from "express";
import { ValidateError } from "tsoa";
import { HttpError } from "../lib/http-error";
import { errorResponse } from "../lib/response";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json(errorResponse("Route not found", `Cannot ${req.method} ${req.path}`));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ValidateError) {
    const errors = Object.entries(err.fields).map(([key, { message }]) => ({
      field: key.split(".").slice(1).join(".") || key,
      message,
    }));
    res.status(422).json(errorResponse("Validation failed", errors));
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json(errorResponse(err.message, err.errors));
    return;
  }

  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json(errorResponse("Invalid JSON body", err.message));
    return;
  }

  console.error(err);
  res.status(500).json(errorResponse("Internal server error"));
}
