import { createHash } from "node:crypto";
import { Injectable, Inject, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import type { AppConfig } from "../config/app-config.js";
import type { SessionRecord, SessionRepository } from "../persistence/repositories/session.repository.js";
import { APP_CONFIG, SESSION_REPOSITORY } from "../tokens.js";
import { SESSION_COOKIE_NAME, parseCookie } from "./cookies.js";

export type DashboardSessionMetadata = Pick<SessionRecord, "id" | "createdAt" | "expiresAt" | "ipAddress">;

@Injectable()
export class DashboardSessionService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(SESSION_REPOSITORY) private readonly sessions: SessionRepository,
  ) {}

  hashToken(token: string): string {
    return createHash("sha256")
      .update(token)
      .update(this.config.dashboardSessionSecret ?? "")
      .digest("hex");
  }

  async authenticate(request: Request): Promise<DashboardSessionMetadata> {
    const token = parseCookie(request.headers.cookie, SESSION_COOKIE_NAME);
    if (!token) throw new UnauthorizedException({ error: { message: "Authentication required" } });
    const session = await this.sessions.findByTokenHash(this.hashToken(token));
    if (!session) throw new UnauthorizedException({ error: { message: "Invalid or expired session" } });
    return this.toMetadata(session);
  }

  async authenticateById(id: string): Promise<DashboardSessionMetadata | undefined> {
    const session = await this.sessions.findActiveById(id);
    return session ? this.toMetadata(session) : undefined;
  }

  async findByRequest(request: Request): Promise<DashboardSessionMetadata | undefined> {
    const token = parseCookie(request.headers.cookie, SESSION_COOKIE_NAME);
    if (!token) return undefined;
    const session = await this.sessions.findByTokenHash(this.hashToken(token));
    return session ? this.toMetadata(session) : undefined;
  }

  private toMetadata(session: SessionRecord): DashboardSessionMetadata {
    return { id: session.id, createdAt: session.createdAt, expiresAt: session.expiresAt, ipAddress: session.ipAddress };
  }
}
