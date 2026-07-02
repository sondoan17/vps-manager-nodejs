import { Body, Controller, Get, Inject, Post, Req, Res, ServiceUnavailableException, UnauthorizedException, UseGuards } from "@nestjs/common";
import { randomBytes, createHash } from "node:crypto";
import type { Request, Response } from "express";
import type { AppConfig } from "../config/app-config.js";
import { verifyPassword } from "../auth/password-hash.js";
import type { AdminCredentialRepository } from "../repositories/admin-credential.repository.js";
import type { SessionRepository } from "../repositories/session.repository.js";
import { ADMIN_CREDENTIAL_REPOSITORY, APP_CONFIG, SESSION_REPOSITORY } from "../tokens.js";
import { DashboardSessionGuard } from "./../auth/dashboard-session.guard.js";
import { OriginGuard } from "./../auth/origin-guard.js";
import { SESSION_COOKIE_NAME, parseCookie } from "./../auth/cookies.js";

/**
 * Hash a session token (with optional secret pepper) for secure storage.
 */
function hashToken(token: string, pepper?: string): string {
  return createHash("sha256").update(token).update(pepper ?? "").digest("hex");
}

/**
 * Create a session for the given request and set the cookie on the response.
 */
async function createSessionAndSetCookie(
  sessions: SessionRepository,
  config: AppConfig,
  req: Request,
  res: Response,
) {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken, config.dashboardSessionSecret);
  const expiresAt = new Date(Date.now() + config.dashboardSessionTtlSeconds * 1000).toISOString();

  const session = await sessions.create({
    tokenHash,
    expiresAt,
    ipAddress: req.ip,
  });

  res.cookie(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: config.dashboardCookieSecure,
    sameSite: config.dashboardCookieSameSite,
    path: "/",
    maxAge: config.dashboardSessionTtlSeconds * 1000,
  });

  return session;
}

@Controller("api/auth")
export class AuthController {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
    @Inject(ADMIN_CREDENTIAL_REPOSITORY) private readonly adminCredential: AdminCredentialRepository,
  ) {}

  /**
   * POST /api/auth/login
   *
   * Accepts `{ password }` and verifies against the DB-backed admin credential.
   * If no credential is configured, returns a safe "setup required" error.
   *
   * Never logs the submitted password.
   */
  @Post("login")
  async login(
    @Body() body: { password?: unknown },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (this.config.mode !== "local") {
      throw new UnauthorizedException({ error: { message: "Auth not available in demo mode" } });
    }

    // 1. Check credential exists before accepting any attempt
    const storedCredential = await this.adminCredential.get();
    if (!storedCredential) {
      throw new ServiceUnavailableException({
        error: { message: "Dashboard password not configured. Run `npm run set-dashboard-password` first." },
      });
    }

    // 2. Validate submitted password (if missing or wrong, same generic error)
    const submittedPassword = typeof body.password === "string" ? body.password : undefined;
    if (!submittedPassword || !verifyPassword(submittedPassword, storedCredential.passwordHash)) {
      throw new UnauthorizedException({ error: { message: "Invalid credentials" } });
    }

    // 3. Success — create session
    const session = await createSessionAndSetCookie(this.sessions, this.config, req, res);
    return {
      data: {
        mode: "local",
        authenticated: true,
        authRequired: true,
        session: {
          id: session.id,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
        },
      },
    };
  }

  /**
   * POST /api/auth/logout
   *
   * Revokes the current session and clears the cookie.
   * Requires a valid session cookie (protected by DashboardSessionGuard).
   */
  @Post("logout")
  @UseGuards(DashboardSessionGuard, OriginGuard)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = parseCookie(req.headers.cookie, SESSION_COOKIE_NAME);
    if (token) {
      const tokenHash = hashToken(token, this.config.dashboardSessionSecret);
      const session = await this.sessions.findByTokenHash(tokenHash);
      if (session) {
        await this.sessions.revoke(session.id);
      }
    }

    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: this.config.dashboardCookieSecure,
      sameSite: this.config.dashboardCookieSameSite,
      path: "/",
    });

    return { data: { ok: true } };
  }

  /**
   * GET /api/auth/me
   *
   * Returns the current auth status.
   * Does not require prior authentication; used by the frontend to determine
   * whether to show a login screen or render the dashboard.
   */
  @Get("me")
  async me(@Req() req: Request) {
    if (this.config.mode !== "local") {
      return {
        data: {
          mode: this.config.mode,
          authenticated: false,
          authRequired: false,
        },
      };
    }

    const token = parseCookie(req.headers.cookie, SESSION_COOKIE_NAME);
    if (!token) {
      return {
        data: {
          mode: "local",
          authenticated: false,
          authRequired: true,
        },
      };
    }

    const tokenHash = hashToken(token, this.config.dashboardSessionSecret);
    const session = await this.sessions.findByTokenHash(tokenHash);

    if (!session) {
      return {
        data: {
          mode: "local",
          authenticated: false,
          authRequired: true,
        },
      };
    }

    return {
      data: {
        mode: "local",
        authenticated: true,
        authRequired: true,
        session: {
          id: session.id,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
        },
      },
    };
  }
}
