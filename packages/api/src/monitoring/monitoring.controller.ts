import {
  Controller,
  Get,
  Inject,
  Param,
  Res,
  Req,
  Logger,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { DashboardSessionGuard } from "../auth/dashboard-session.guard.js";
import { OriginGuard } from "../auth/origin-guard.js";
import { MonitoringService } from "./monitoring.service.js";

@Controller("api/monitoring")
@UseGuards(DashboardSessionGuard, OriginGuard)
export class MonitoringController {
  private readonly logger = new Logger(MonitoringController.name);

  constructor(
    @Inject(MonitoringService)
    private readonly monitoringService: MonitoringService,
  ) {}

  @Get("stream/:vpsId")
  async streamForVps(@Param("vpsId") vpsId: string, @Req() req: Request, @Res() res: Response): Promise<void> {
    this.logger.log(`Scoped SSE stream connected: ${vpsId}`);
    try {
      await this.monitoringService.streamForVps(res, vpsId, req.get("Last-Event-ID") ?? undefined);
    } catch (error) {
      this.logger.error("Scoped SSE stream error", error instanceof Error ? error.message : String(error));
      if (!res.headersSent) res.status(500).json({ error: { message: "Internal server error" } });
    }
  }

  @Get("stream")
  async stream(@Req() req: Request, @Res() res: Response): Promise<void> {
    this.logger.log("SSE stream connected");
    try {
      await this.monitoringService.stream(res, req.get("Last-Event-ID") ?? undefined);
    } catch (error) {
      this.logger.error(
        "SSE stream error",
        error instanceof Error ? error.message : String(error),
      );
      if (!res.headersSent) {
        res.status(500).json({ error: { message: "Internal server error" } });
      }
    }
  }
}
