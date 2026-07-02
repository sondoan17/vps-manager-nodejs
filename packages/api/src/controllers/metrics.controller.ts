import { Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";
import { DashboardSessionGuard } from "../auth/dashboard-session.guard.js";
import { OriginGuard } from "../auth/origin-guard.js";
import { MetricService } from "../services/metric.service.js";

@Controller("api/metrics")
@UseGuards(DashboardSessionGuard, OriginGuard)
export class MetricsController {
  constructor(@Inject(MetricService) private readonly metricService: MetricService) {}

  @Get()
  async list(@Query("vpsId") vpsId?: string) {
    return { data: await this.metricService.list(vpsId) };
  }
}
