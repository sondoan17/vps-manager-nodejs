import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { DashboardSessionGuard } from "../auth/dashboard-session.guard.js";
import { OriginGuard } from "../auth/origin-guard.js";
import {
  buildPageMeta,
  parsePagination,
  type PaginationQuery,
} from "../common/pagination.js";
import { AuditService, type AuditFilter } from "../audit/audit.service.js";
import { JobService } from "../jobs/job.service.js";
import { MetricService } from "../metrics/metric.service.js";
import { MonitoringService } from "../monitoring/monitoring.service.js";
import { VpsService } from "./vps.service.js";

@Controller("api/vps")
@UseGuards(DashboardSessionGuard, OriginGuard)
export class VpsController {
  constructor(
    @Inject(VpsService) private readonly vps: VpsService,
    @Inject(JobService) private readonly jobs: JobService,
    @Inject(MetricService) private readonly metrics: MetricService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(MonitoringService) private readonly monitoring: MonitoringService,
  ) {}

  @Get()
  async list() {
    return { data: await this.vps.list() };
  }

  @Post()
  @HttpCode(201)
  async create(@Body() body: unknown) {
    return { data: await this.vps.create(body) };
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    return { data: await this.vps.get(id) };
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: unknown) {
    return { data: await this.vps.update(id, body) };
  }

  @Delete(":id")
  @HttpCode(204)
  async delete(@Param("id") id: string) {
    await this.vps.delete(id);
  }

  @Post(":id/provision-key")
  async provisionKey(@Param("id") id: string, @Body() body: unknown) {
    return { data: await this.vps.provisionKey(id, body) };
  }

  @Post(":id/verify-key")
  async verifyKey(@Param("id") id: string) {
    await this.vps.verifyKey(id);
    return { data: { ok: true } };
  }

  @Post(":id/install-agent")
  async installAgent(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const requestHost = req.get("host");
    const result = await this.vps.installAgent(id, body, requestHost);
    return {
      data: {
        jobId: result.jobId,
        state: {
          status: result.state.status,
          lastInstallJobId: result.state.lastInstallJobId,
        },
      },
    };
  }

  // ── Scoped VPS endpoints ───────────────────────────────────────────────

  /**
   * List jobs scoped to a VPS. Validates VPS exists before returning.
   */
  @Get(":id/jobs")
  async listVpsJobs(@Param("id") id: string, @Query() query: PaginationQuery) {
    await this.vps.get(id); // validate VPS exists
    const page = parsePagination(query, "jobs");
    const data = await this.jobs.listByVpsId(id, page);
    return { data, page: buildPageMeta(page, data.length) };
  }

  /**
   * List latest metrics scoped to a VPS. Validates VPS exists.
   */
  @Get(":id/metrics")
  async listVpsMetrics(@Param("id") id: string) {
    await this.vps.get(id); // validate VPS exists
    const data = await this.metrics.list(id);
    return { data };
  }

  /**
   * List audit events scoped to a VPS, including direct VPS events,
   * job-related events, and serverLabel legacy fallback.
   * Validates VPS exists. Filter-before-pagination.
   */
  @Get(":id/audit")
  async listVpsAudit(
    @Param("id") id: string,
    @Query() query: PaginationQuery & AuditFilter,
  ) {
    const vps = await this.vps.get(id); // validate VPS exists
    // Get VPS job IDs for job-related audit matching
    const vpsJobs = await this.jobs.listByVpsId(id);
    const vpsJobIds = vpsJobs.map((j) => j.id);
    // Strip resourceId from query so path param always wins
    const {
      limit: _l,
      offset: _o,
      resourceId: _queryRid,
      action,
      result,
    } = query;
    const page = parsePagination({ limit: _l, offset: _o }, "audit");
    const data = await this.audit.listForVps(
      id,
      vps.name,
      vpsJobIds,
      {
        action: action as string | undefined,
        result: result as string | undefined,
      },
      page,
    );
    return { data, page: buildPageMeta(page, data.length) };
  }

  /**
   * SSE monitoring stream scoped to a single VPS. Validates VPS exists before headers.
   */
  @Get(":id/monitoring/stream")
  async streamVpsMonitoring(
    @Param("id") id: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.vps.get(id); // validate VPS exists before writing SSE headers
    try {
      await this.monitoring.streamForVps(res, id);
    } catch (error) {
      const vpsLogger = new Logger("VpsController");
      vpsLogger.error(
        "Scoped SSE stream error",
        error instanceof Error ? error.message : String(error),
      );
      if (!res.headersSent) {
        res.status(500).json({ error: { message: "Internal server error" } });
      }
    }
  }
}
