import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors.js";
import { ZodError } from "zod";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Validation error",
      errors: err.flatten().fieldErrors,
    });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
}
