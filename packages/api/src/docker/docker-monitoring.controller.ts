import { BadRequestException, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { DashboardSessionGuard } from "../auth/dashboard-session.guard.js";
import { OriginGuard } from "../auth/origin-guard.js";
import { DockerMonitoringService } from "./docker-monitoring.service.js";
import {
  dockerAlertAcknowledgeSchema,
  dockerAlertsQuerySchema,
  dockerContainerHistoryQuerySchema,
  dockerEventsQuerySchema,
  dockerHostHistoryQuerySchema,
  dockerRollupsQuerySchema,
} from "./docker-monitoring.schemas.js";

function parseQuery(schema: { parse: (value: unknown) => unknown }, value: unknown, vpsId: string) {
  try {
    return schema.parse({ ...(value as Record<string, unknown>), vpsId });
  } catch {
    throw new BadRequestException({ error: { message: "Invalid Docker monitoring query" } });
  }
}

@Controller("api/vps/:id/docker")
@UseGuards(DashboardSessionGuard, OriginGuard)
export class DockerMonitoringController {
  constructor(@Inject(DockerMonitoringService) private readonly service: DockerMonitoringService) {}
  @Get("history") host(@Param("id") id: string, @Query() q: Record<string, unknown>) { return this.service.hostHistory(parseQuery(dockerHostHistoryQuerySchema, q, id) as never); }
  @Get("instances/:agentInstanceId/containers/:containerKey/history") container(@Param("id") id: string, @Param("agentInstanceId") agentInstanceId: string, @Param("containerKey") containerKey: string, @Query() q: Record<string, unknown>) { return this.service.containerHistory(parseQuery(dockerContainerHistoryQuerySchema, { ...q, agentInstanceId, containerKey }, id) as never); }
  @Get("events") events(@Param("id") id: string, @Query() q: Record<string, unknown>) { return this.service.events(parseQuery(dockerEventsQuerySchema, q, id) as never); }
  @Get("storage") async storage(@Param("id") id: string) { const data = await this.service.storage(id); return { data: data ?? null }; }
  @Get("rollups") rollups(@Param("id") id: string, @Query() q: Record<string, unknown>) { return this.service.rollups(parseQuery(dockerRollupsQuerySchema, q, id) as never); }
  @Get("alerts") alerts(@Param("id") id: string, @Query() q: Record<string, unknown>) { return this.service.alerts(parseQuery(dockerAlertsQuerySchema, q, id) as never); }
  @Post("alerts/:alertId/acknowledge") acknowledge(@Param("id") id: string, @Param("alertId") alertId: string, @Req() req: Request) { dockerAlertAcknowledgeSchema.parse({ vpsId: id, alertId }); const actor = req.dashboardSessionId ?? "dashboard"; return this.service.acknowledge(id, alertId, actor, { requestId: req.requestId }); }
}
