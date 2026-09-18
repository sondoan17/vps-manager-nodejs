import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import type { AppConfig } from "../config/app-config.js";
import { verifyPassword } from "./password-hash.js";
import type { AdminCredentialRepository } from "../persistence/repositories/admin-credential.repository.js";
import type { SessionRepository } from "../persistence/repositories/session.repository.js";
import {
  ADMIN_CREDENTIAL_REPOSITORY,
  APP_CONFIG,
  SESSION_REPOSITORY,
} from "../tokens.js";
import { DashboardSessionGuard } from "./dashboard-session.guard.js";
import { OriginGuard } from "./origin-guard.js";
import { SESSION_COOKIE_NAME } from "./cookies.js";
import { DashboardSessionService } from "./dashboard-session.service.js";

/**
 * Create a session for the given request and set the cookie on the response.
 */
async function createSessionAndSetCookie(
  sessions: SessionRepository,
  sessionService: DashboardSessionService,
  config: AppConfig,
  req: Request,
  res: Response,
) {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = sessionService.hashToken(rawToken);
  const expiresAt = new Date(
    Date.now() + config.dashboardSessionTtlSeconds * 1000,
  ).toISOString();

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
    @Inject(ADMIN_CREDENTIAL_REPOSITORY)
    private readonly adminCredential: AdminCredentialRepository,
    @Inject(DashboardSessionService)
    private readonly sessionService: DashboardSessionService,
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
      throw new UnauthorizedException({
        error: { message: "Auth not available in demo mode" },
      });
    }

    // 1. Check credential exists before accepting any attempt
    const storedCredential = await this.adminCredential.get();
    if (!storedCredential) {
      throw new ServiceUnavailableException({
        error: {
          message:
            "Dashboard password not configured. Run `npm run set-dashboard-password` first.",
        },
      });
    }

    // 2. Validate submitted password (if missing or wrong, same generic error)
    const submittedPassword =
      typeof body.password === "string" ? body.password : undefined;
    if (
      !submittedPassword ||
      !verifyPassword(submittedPassword, storedCredential.passwordHash)
    ) {
      throw new UnauthorizedException({
        error: { message: "Invalid credentials" },
      });
    }

    // 3. Success — create session
    const session = await createSessionAndSetCookie(
      this.sessions,
      this.sessionService,
      this.config,
      req,
      res,
    );
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
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const session = await this.sessionService.findByRequest(req);
    if (session) await this.sessions.revoke(session.id);

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

    const session = await this.sessionService.findByRequest(req);
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
