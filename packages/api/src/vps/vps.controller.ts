import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { DashboardSessionGuard } from "../auth/dashboard-session.guard.js";
import { OriginGuard } from "../auth/origin-guard.js";
import { VpsService } from "./vps.service.js";

@Controller("api/vps")
@UseGuards(DashboardSessionGuard, OriginGuard)
export class VpsController {
  constructor(@Inject(VpsService) private readonly vps: VpsService) {}

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
  async installAgent(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const requestHost = req.get("host");
    const result = await this.vps.installAgent(id, body, requestHost);
    return { data: { jobId: result.jobId, state: { status: result.state.status, lastInstallJobId: result.state.lastInstallJobId } } };
  }
}
