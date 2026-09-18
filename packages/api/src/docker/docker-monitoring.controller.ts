import { Controller, Get, Inject, Param, Post, Query, UseGuards } from "@nestjs/common";
import { DashboardSessionGuard } from "../auth/dashboard-session.guard.js";
import { OriginGuard } from "../auth/origin-guard.js";
import { DockerMonitoringService } from "./docker-monitoring.service.js";
import { dockerAlertAcknowledgeSchema } from "./docker-monitoring.schemas.js";

@Controller("api/vps/:id/docker")
@UseGuards(DashboardSessionGuard, OriginGuard)
export class DockerMonitoringController {
  constructor(@Inject(DockerMonitoringService) private readonly service: DockerMonitoringService) {}
  @Get("history") host(@Param("id") id: string, @Query() q: Record<string, unknown>) { return this.service.hostHistory({ ...q, vpsId: id } as never); }
  @Get("instances/:agentInstanceId/containers/:containerKey/history") container(@Param("id") id: string, @Param("agentInstanceId") agentInstanceId: string, @Param("containerKey") containerKey: string, @Query() q: Record<string, unknown>) { return this.service.containerHistory({ ...q, vpsId: id, agentInstanceId, containerKey } as never); }
  @Get("events") events(@Param("id") id: string, @Query() q: Record<string, unknown>) { return this.service.events({ ...q, vpsId: id } as never); }
  @Get("storage") async storage(@Param("id") id: string) { const data = await this.service.storage(id); return { data: data ?? null }; }
  @Get("alerts") alerts(@Param("id") id: string, @Query() q: Record<string, unknown>) { return this.service.alerts({ ...q, vpsId: id } as never); }
  @Post("alerts/:alertId/acknowledge") acknowledge(@Param("id") id: string, @Param("alertId") alertId: string) { dockerAlertAcknowledgeSchema.parse({ vpsId: id, alertId }); return this.service.acknowledge(id); }
}
