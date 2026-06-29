import { Inject, Injectable } from "@nestjs/common";
import type { AppConfig } from "../config/app-config.js";
import { getDemoMetrics } from "../demo/demo-fixtures.js";
import type { MetricSample } from "../models/metrics.js";
import type { MetricRepository } from "../repositories/metric.repository.js";
import { APP_CONFIG, METRIC_REPOSITORY } from "../tokens.js";

@Injectable()
export class MetricService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(METRIC_REPOSITORY) private readonly metricRepository: MetricRepository
  ) {}

  async list(vpsId?: string): Promise<MetricSample[]> {
    if (this.config.mode === "demo") {
      let results = getDemoMetrics();
      if (vpsId) {
        results = results.filter((m) => m.vpsId === vpsId);
      }
      return results;
    }

    let results = await this.metricRepository.list();
    if (vpsId) {
      results = results.filter((m) => m.vpsId === vpsId);
    }
    return results;
  }
}
