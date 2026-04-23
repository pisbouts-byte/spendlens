import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.js";
import { UnauthorizedError } from "../utils/errors.js";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    next(new UnauthorizedError("Missing or invalid authorization header"));
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    next();
  } catch {
    next(new UnauthorizedError("Invalid or expired token"));
  }
}
