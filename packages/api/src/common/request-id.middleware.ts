import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export const REQUEST_ID_HEADER = "X-Request-Id";

function safeRequestId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!/^[A-Za-z0-9._-]{8,80}$/.test(value)) return undefined;
  return value;
}

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const requestId =
    safeRequestId(req.header(REQUEST_ID_HEADER)) ?? randomUUID();
  req.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}

declare module "express-serve-static-core" {
  interface Request {
    requestId?: string;
  }
}
