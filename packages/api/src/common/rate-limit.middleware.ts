import type { NextFunction, Request, Response } from "express";
import type { AppConfig } from "../config/app-config.js";

type Bucket = { count: number; resetAt: number };

export function createMutationRateLimit(config: AppConfig) {
  const buckets = new Map<string, Bucket>();

  return function mutationRateLimit(req: Request, res: Response, next: NextFunction) {
    if (!["POST", "PATCH", "DELETE"].includes(req.method)) return next();
    if (!req.path.startsWith("/api/vps")) return next();

    const now = Date.now();
    const key = req.ip || "unknown";
    const current = buckets.get(key);
    const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + config.rateLimitWindowMs } : current;
    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > config.rateLimitMax) {
      return res.status(429).json({ error: { message: "Too many requests", requestId: req.requestId } });
    }

    next();
  };
}
