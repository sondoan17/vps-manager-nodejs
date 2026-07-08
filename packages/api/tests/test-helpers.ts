import { createHash, randomBytes } from "node:crypto";
import { join } from "node:path";
import { createJsonSessionRepository } from "../src/persistence/repositories/session.repository.js";
import { SESSION_COOKIE_NAME } from "../src/auth/cookies.js";

/**
 * Create a dashboard session in the JSON store directly (bypasses login)
 * and returns the cookie header value for use with supertest.
 *
 * @param tempDir - Temporary directory where data/sessions.json lives
 * @param sessionSecret - DASHBOARD_SESSION_SECRET used to hash the token
 * @param ttlSeconds - Session TTL (default 86400)
 */
export async function createSessionCookie(
  tempDir: string,
  sessionSecret?: string,
  ttlSeconds = 86_400,
): Promise<string> {
  const repo = createJsonSessionRepository(
    join(tempDir, "data", "sessions.json"),
  );
  const rawToken = randomBytes(32).toString("hex");
  const pepper = sessionSecret ?? "";
  const tokenHash = createHash("sha256")
    .update(rawToken)
    .update(pepper)
    .digest("hex");

  await repo.create({
    tokenHash,
    expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
  });

  return `${SESSION_COOKIE_NAME}=${rawToken}`;
}
