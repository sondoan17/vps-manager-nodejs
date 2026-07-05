import type { NextFunction, Request, Response } from "express";
import { createInMemoryRateLimitStore, type RateLimitStore } from "./rate-limit-store.js";

/**
 * Rate limiter for POST /api/auth/login.
 *
 * Allows 5 attempts per IP within a 5-minute fixed window.
 *
 * Defaults to in-memory store. Pass a Postgres store for shared DB-backed
 * rate limiting across multi-instance deployments.
 */
export function createLoginRateLimit(store?: RateLimitStore) {
  const limiter = store ?? createInMemoryRateLimitStore();
  const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
  const MAX_ATTEMPTS = 5;

  return function loginRateLimit(req: Request, res: Response, next: NextFunction) {
    if (req.method !== "POST" || req.path !== "/api/auth/login") return next();

    const key = req.ip || "unknown";

    limiter.consume(`login:${key}`, WINDOW_MS, MAX_ATTEMPTS)
      .then(({ count, resetAtMs }) => {
        if (count > MAX_ATTEMPTS) {
          const retryAfter = Math.ceil((resetAtMs - Date.now()) / 1000);
          if (retryAfter > 0) {
            res.set("Retry-After", String(retryAfter));
          }
          return res.status(429).json({
            error: { message: "Too many login attempts. Try again later.", requestId: req.requestId },
          });
        }
        next();
      })
      .catch(() => {
        // Store error: fail closed with 503
        return res.status(503).json({ error: { message: "Rate limiter unavailable", requestId: req.requestId } });
      });
  };
}
