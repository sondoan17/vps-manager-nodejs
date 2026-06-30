import type { NextFunction, Request, Response } from "express";
import type { AppConfig } from "../config/app-config.js";

type Bucket = { count: number; resetAt: number };

/**
 * Shared in-process rate limiter.
 *
 * Applies a higher limit to agent metric routes (multiplier × rateLimitMax)
 * to support multiple agents pushing at 1–2s cadence without blocking.
 *
 * Single-process / in-memory only — not suitable for multi-instance deployments.
 */
export function createMutationRateLimit(config: AppConfig) {
  const buckets = new Map<string, Bucket>();
  // Agent routes get a higher limit to support ~5 agents at 1s cadence
  const AGENT_LIMIT_MULTIPLIER = 5;

  return function mutationRateLimit(req: Request, res: Response, next: NextFunction) {
    if (!["POST", "PATCH", "DELETE"].includes(req.method)) return next();
    if (!req.path.startsWith("/api/vps") && !req.path.startsWith("/api/agent")) return next();

    const now = Date.now();
    const key = req.ip || "unknown";
    const current = buckets.get(key);
    const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + config.rateLimitWindowMs } : current;
    bucket.count += 1;
    buckets.set(key, bucket);

    const isAgent = req.path.startsWith("/api/agent");
    const maxRequests = isAgent ? config.rateLimitMax * AGENT_LIMIT_MULTIPLIER : config.rateLimitMax;

    if (bucket.count > maxRequests) {
      return res.status(429).json({ error: { message: "Too many requests", requestId: req.requestId } });
    }

    next();
  };
}
