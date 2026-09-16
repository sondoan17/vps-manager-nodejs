import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";
import type { AppConfig } from "../config/app-config.js";
import { DashboardSessionService } from "./dashboard-session.service.js";
import { APP_CONFIG } from "../tokens.js";

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
    @Inject(DashboardSessionService)
    private readonly sessionService: DashboardSessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Demo mode: always allow
    if (this.config.mode !== "local") return true;

    const request = context.switchToHttp().getRequest<Request>();
    const session = await this.sessionService.authenticate(request);

    (request as Request & { dashboardSessionId?: string }).dashboardSessionId =
      session.id;
    return true;
  }
}

// Extend Express Request type for session id
declare module "express-serve-static-core" {
  interface Request {
    dashboardSessionId?: string;
  }
}
