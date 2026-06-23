import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import type { AppConfig } from "../config/app-config.js";
import { APP_CONFIG } from "../tokens.js";

@Injectable()
export class LocalAuthGuard implements CanActivate {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.config.mode !== "local") return true;

    const request = context.switchToHttp().getRequest<Request>();
    const header = request.header("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
    if (token && token === this.config.localAuthToken) return true;

    throw new UnauthorizedException({ error: { message: "Authentication required" } });
  }
}
