import type { NextFunction, Request, Response } from "express";

type Bucket = { count: number; resetAt: number };

/**
 * Strict in-process rate limiter for POST /api/auth/login.
 *
 * Allows 5 attempts per IP within a 5‑minute sliding window.
 * Resets after each window.
 *
 * Single-process / in-memory only — not suitable for multi-instance deployments.
 * For multi-instance, replace with a Redis-based implementation.
 */
export function createLoginRateLimit() {
  const buckets = new Map<string, Bucket>();
  const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
  const MAX_ATTEMPTS = 5;

  return function loginRateLimit(req: Request, res: Response, next: NextFunction) {
    if (req.method !== "POST" || req.path !== "/api/auth/login") return next();

    const now = Date.now();
    const key = req.ip || "unknown";
    const current = buckets.get(key);
    const bucket: Bucket = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + WINDOW_MS }
      : current;

    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > MAX_ATTEMPTS) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({
        error: { message: "Too many login attempts. Try again later.", requestId: req.requestId },
      });
    }

    next();
  };
}
