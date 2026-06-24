import { Controller, Get, Inject } from "@nestjs/common";
import { DashboardService } from "../dashboard/dashboard.service.js";

@Controller("api/dashboard")
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly dashboard: DashboardService) {}

  @Get()
  async overview() {
    return { data: await this.dashboard.overview() };
  }
}
