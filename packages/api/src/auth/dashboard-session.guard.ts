import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { Request } from "express";
import type { AppConfig } from "../config/app-config.js";
import type { SessionRepository } from "../repositories/session.repository.js";
import { APP_CONFIG, SESSION_REPOSITORY } from "../tokens.js";
import { SESSION_COOKIE_NAME, parseCookie } from "./cookies.js";

/**
 * Hash a session token (with optional secret pepper) for secure storage.
 */
function hashToken(token: string, pepper?: string): string {
  return createHash("sha256").update(token).update(pepper ?? "").digest("hex");
}

/**
 * Dashboard session guard.
 *
 * - APP_MODE=demo: always allows access (no auth required).
 * - APP_MODE=local: requires a valid dashboard session cookie.
 *
 * Reads the session cookie, looks up the session by its hash,
 * checks expiration, and sets `request.dashboardSessionId` for audit logging.
 *
 * Local auth is cookie-only after login with the DB-backed admin password.
 */
@Injectable()
export class DashboardSessionGuard implements CanActivate {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Demo mode: always allow
    if (this.config.mode !== "local") return true;

    const request = context.switchToHttp().getRequest<Request>();
    const cookieToken = parseCookie(request.headers.cookie, SESSION_COOKIE_NAME);

    if (!cookieToken) {
      throw new UnauthorizedException({ error: { message: "Authentication required" } });
    }

    const tokenHash = hashToken(cookieToken, this.config.dashboardSessionSecret);
    const session = await this.sessions.findByTokenHash(tokenHash);

    if (!session) {
      throw new UnauthorizedException({ error: { message: "Invalid or expired session" } });
    }

    (request as Request & { dashboardSessionId?: string }).dashboardSessionId = session.id;
    return true;
  }
}

// Extend Express Request type for session id
declare module "express-serve-static-core" {
  interface Request {
    dashboardSessionId?: string;
  }
}
