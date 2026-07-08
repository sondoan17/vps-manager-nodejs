import { Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";
import { DashboardSessionGuard } from "../auth/dashboard-session.guard.js";
import { OriginGuard } from "../auth/origin-guard.js";
import {
  buildPageMeta,
  parsePagination,
  type PaginationQuery,
} from "../common/pagination.js";
import { MetricService } from "./metric.service.js";

@Controller("api/metrics")
@UseGuards(DashboardSessionGuard, OriginGuard)
export class MetricsController {
  constructor(
    @Inject(MetricService) private readonly metricService: MetricService,
  ) {}

  @Get()
  async list(@Query("vpsId") vpsId?: string, @Query() query?: PaginationQuery) {
    // vpsId filter means latest-only (0 or 1 item) — no pagination
    if (vpsId) {
      const data = await this.metricService.list(vpsId);
      return { data };
    }

    // No vpsId: paginated latest list
    const page = parsePagination(query ?? {}, "metrics");
    const data = await this.metricService.list(undefined, page);
    return { data, page: buildPageMeta(page, data.length) };
  }
}
