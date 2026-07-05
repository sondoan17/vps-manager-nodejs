import type { Pool } from "pg";

/**
 * Result of a rate-limit consume call.
 */
export type RateLimitResult = {
  /** Number of requests in the current window (including this one). */
  count: number;
  /** Epoch ms when the current window expires and the bucket resets. */
  resetAtMs: number;
};

/**
 * Pluggable rate-limit store.
 */
export interface RateLimitStore {
  consume(key: string, windowMs: number, maxRequests: number): Promise<RateLimitResult>;
}

// ---------------------------------------------------------------------------
// In-memory implementation (fixed window, per-process)
// ---------------------------------------------------------------------------

type Bucket = { count: number; resetAt: number };

export function createInMemoryRateLimitStore(): RateLimitStore {
  const buckets = new Map<string, Bucket>();

  return {
    async consume(key: string, windowMs: number, _maxRequests: number): Promise<RateLimitResult> {
      const now = Date.now();
      const current = buckets.get(key);
      const bucket: Bucket = !current || current.resetAt <= now
        ? { count: 0, resetAt: now + windowMs }
        : current;

      bucket.count += 1;
      buckets.set(key, bucket);

      return { count: bucket.count, resetAtMs: bucket.resetAt };
    },
  };
}

// ---------------------------------------------------------------------------
// Postgres implementation (atomic UPSERT, DB time)
// ---------------------------------------------------------------------------

export function createPostgresRateLimitStore(pool: Pool): RateLimitStore {
  return {
    async consume(key: string, windowMs: number, _maxRequests: number): Promise<RateLimitResult> {
      // Atomic UPSERT:
      //  - Expired bucket → reset to count=1 at now()+windowMs
      //  - Active bucket  → increment count
      //  - No separate SELECT, no DELETE cleanup needed
      const sql = `
        INSERT INTO rate_limit_buckets (bucket_key, count, reset_at, updated_at)
        VALUES ($1, 1, now() + ($2::double precision * interval '1 millisecond'), now())
        ON CONFLICT (bucket_key) DO UPDATE SET
          count   = CASE
                      WHEN rate_limit_buckets.reset_at <= now() THEN 1
                      ELSE rate_limit_buckets.count + 1
                    END,
          reset_at = CASE
                      WHEN rate_limit_buckets.reset_at <= now() THEN now() + ($2::double precision * interval '1 millisecond')
                      ELSE rate_limit_buckets.reset_at
                    END,
          updated_at = now()
        RETURNING count, reset_at
      `;

      const queryResult = await pool.query<{ count: number; reset_at: Date }>(sql, [key, windowMs]);
      const result = queryResult.rows[0];
      if (!result) {
        throw new Error("Rate limit store did not return a bucket");
      }

      return {
        count: result.count,
        resetAtMs: new Date(result.reset_at).getTime(),
      };
    },
  };
}
