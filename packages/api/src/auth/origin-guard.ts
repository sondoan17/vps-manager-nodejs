import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from "@nestjs/common";
import type { Request } from "express";
import type { AppConfig } from "../config/app-config.js";
import { APP_CONFIG } from "../tokens.js";

/**
 * Origin/CSRF protection guard for cookie-authenticated unsafe methods.
 *
 * - In demo mode: always allows (no auth, no CSRF risk).
 * - In local mode: for unsafe methods (POST, PATCH, DELETE, etc.),
 *   validates the Origin header. Missing Origin is rejected because
 *   cookie-authenticated browser requests always include Origin for
 *   cross-origin unsafe requests, and the bearer fallback has been removed.
 *
 * Allowed origins:
 *   1. Same-origin (Origin host matches the Host header).
 *   2. Configured DASHBOARD_PUBLIC_ORIGIN (exact string match).
 */
@Injectable()
export class OriginGuard implements CanActivate {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  canActivate(context: ExecutionContext): boolean {
    // Demo mode: no CSRF protection needed
    if (this.config.mode !== "local") return true;

    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    // Safe methods do not need origin checks
    if (["GET", "HEAD", "OPTIONS"].includes(method)) return true;

    const origin = request.headers.origin as string | undefined;

    // Missing Origin is rejected for unsafe cookie-authenticated requests.
    // Browser-originated unsafe requests (POST/PATCH/DELETE) always include
    // Origin when cross-origin, and same-origin requests without Origin
    // (legacy) are increasingly rare. Non-browser clients must configure
    // DASHBOARD_PUBLIC_ORIGIN or make requests from a same-origin context.
    if (!origin) {
      throw new ForbiddenException({ error: { message: "Origin header required" } });
    }

    // Same-origin: origin host matches the request host
    const host = request.headers.host;
    try {
      const originUrl = new URL(origin);
      if (host && originUrl.host === host) return true;
    } catch {
      throw new ForbiddenException({ error: { message: "Invalid origin" } });
    }

    // Allow configured public origin
    if (this.config.dashboardPublicOrigin && origin === this.config.dashboardPublicOrigin) return true;

    throw new ForbiddenException({ error: { message: "Origin not allowed" } });
  }
}
