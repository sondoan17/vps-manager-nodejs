import { Body, Controller, Get, Inject, Post, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import { randomBytes } from "node:crypto";
import { createHash } from "node:crypto";
import type { Request, Response } from "express";
import type { AppConfig } from "../config/app-config.js";
import type { SessionRepository } from "../repositories/session.repository.js";
import { APP_CONFIG, SESSION_REPOSITORY } from "../tokens.js";
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
 * Timing-safe comparison of two strings.
 * Always returns false for mismatched lengths to prevent length oracle attacks.
 */
function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

@Controller("api/auth")
export class AuthController {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
  ) {}

  /**
   * POST /api/auth/login
   *
   * Accepts the LOCAL_AUTH_TOKEN as the login secret.
   * On success, creates a server-side session and sets an HttpOnly cookie.
   *
   * Never logs the submitted token.
   */
  @Post("login")
  async login(
    @Body() body: { token?: unknown },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (this.config.mode !== "local") {
      throw new UnauthorizedException({ error: { message: "Auth not available in demo mode" } });
    }

    const submitted = typeof body.token === "string" ? body.token : "";
    const secret = this.config.localAuthToken;

    if (!secret || !safeEquals(submitted, secret)) {
      throw new UnauthorizedException({ error: { message: "Invalid authentication token" } });
    }

    // Generate opaque session token
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken, this.config.dashboardSessionSecret);
    const expiresAt = new Date(Date.now() + this.config.dashboardSessionTtlSeconds * 1000).toISOString();

    const session = await this.sessions.create({
      tokenHash,
      expiresAt,
      ipAddress: req.ip,
    });

    // Set HttpOnly session cookie
    res.cookie(SESSION_COOKIE_NAME, rawToken, {
      httpOnly: true,
      secure: this.config.dashboardCookieSecure,
      sameSite: this.config.dashboardCookieSameSite,
      path: "/",
      maxAge: this.config.dashboardSessionTtlSeconds * 1000,
    });

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
