import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { LocalAuthGuard } from "../auth/local-auth.guard.js";
import { VpsService } from "../services/vps.service.js";

@Controller("api/vps")
export class VpsController {
  constructor(@Inject(VpsService) private readonly vps: VpsService) {}

  @Get()
  async list() {
    return { data: await this.vps.list() };
  }

  @Post()
  @HttpCode(201)
  @UseGuards(LocalAuthGuard)
  async create(@Body() body: unknown) {
    return { data: await this.vps.create(body) };
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    return { data: await this.vps.get(id) };
  }

  @Patch(":id")
  @UseGuards(LocalAuthGuard)
  async update(@Param("id") id: string, @Body() body: unknown) {
    return { data: await this.vps.update(id, body) };
  }

  @Delete(":id")
  @HttpCode(204)
  @UseGuards(LocalAuthGuard)
  async delete(@Param("id") id: string) {
    await this.vps.delete(id);
  }

  @Post(":id/provision-key")
  @UseGuards(LocalAuthGuard)
  async provisionKey(@Param("id") id: string, @Body() body: unknown) {
    return { data: await this.vps.provisionKey(id, body) };
  }

  @Post(":id/verify-key")
  @UseGuards(LocalAuthGuard)
  async verifyKey(@Param("id") id: string) {
    await this.vps.verifyKey(id);
    return { data: { ok: true } };
  }
}
