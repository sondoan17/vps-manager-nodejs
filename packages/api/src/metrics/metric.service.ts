import { Inject, Injectable } from "@nestjs/common";
import type { AppConfig } from "../config/app-config.js";
import { getDemoMetrics } from "../demo/demo-fixtures.js";
import type { MetricSample } from "../metrics/metrics.models.js";
import type { MetricRepository } from "../persistence/repositories/metric.repository.js";
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

  async append(sample: MetricSample): Promise<MetricSample> {
    return this.metricRepository.append(sample);
  }

  async listLatest(vpsId?: string): Promise<MetricSample[]> {
    const results = await this.metricRepository.listLatest();
    if (vpsId) {
      return results.filter((m) => m.vpsId === vpsId);
    }
    return results;
  }

  async getLatest(vpsId: string): Promise<MetricSample | undefined> {
    return this.metricRepository.getLatest(vpsId);
  }

  async upsertLatest(sample: MetricSample): Promise<MetricSample> {
    return this.metricRepository.upsertLatest(sample);
  }

  async appendWindow(sample: MetricSample, limit?: number): Promise<void> {
    return this.metricRepository.appendWindow(sample, limit);
  }

  async listWindow(vpsId: string, limit?: number): Promise<MetricSample[]> {
    return this.metricRepository.listWindow(vpsId, limit);
  }
}
