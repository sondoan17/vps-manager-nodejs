import { Controller, Get, Inject, Res, Logger, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { DashboardSessionGuard } from "../auth/dashboard-session.guard.js";
import { OriginGuard } from "../auth/origin-guard.js";
import { MonitoringService } from "../services/monitoring.service.js";

@Controller("api/monitoring")
@UseGuards(DashboardSessionGuard, OriginGuard)
export class MonitoringController {
  private readonly logger = new Logger(MonitoringController.name);

  constructor(
    @Inject(MonitoringService) private readonly monitoringService: MonitoringService,
  ) {}

  @Get("stream")
  async stream(@Res() res: Response): Promise<void> {
    this.logger.log("SSE stream connected");
    try {
      await this.monitoringService.stream(res);
    } catch (error) {
      this.logger.error("SSE stream error", error instanceof Error ? error.message : String(error));
      if (!res.headersSent) {
        res.status(500).json({ error: { message: "Internal server error" } });
      }
    }
  }
}
