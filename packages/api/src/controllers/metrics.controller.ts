import { Controller, Get, Inject, Query } from "@nestjs/common";
import { MetricService } from "../services/metric.service.js";

@Controller("api/metrics")
export class MetricsController {
  constructor(@Inject(MetricService) private readonly metricService: MetricService) {}

  @Get()
  async list(@Query("vpsId") vpsId?: string) {
    return { data: await this.metricService.list(vpsId) };
  }
}
