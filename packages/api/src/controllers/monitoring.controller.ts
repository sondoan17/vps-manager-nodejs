import { Controller, Get, Inject, Res, Logger } from "@nestjs/common";
import type { Response } from "express";
import { MonitoringService } from "../services/monitoring.service.js";

@Controller("api/monitoring")
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
