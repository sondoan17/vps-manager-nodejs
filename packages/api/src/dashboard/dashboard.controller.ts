import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { DashboardSessionGuard } from "../auth/dashboard-session.guard.js";
import { OriginGuard } from "../auth/origin-guard.js";
import { DashboardService } from "./dashboard.service.js";

@Controller("api/dashboard")
@UseGuards(DashboardSessionGuard, OriginGuard)
export class DashboardController {
  constructor(
    @Inject(DashboardService) private readonly dashboard: DashboardService,
  ) {}

  @Get()
  async overview() {
    return { data: await this.dashboard.overview() };
  }
}
