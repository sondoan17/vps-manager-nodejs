import type { MetricSample } from "../models/metrics.js";
import { readJsonFile, writeJsonFile } from "./json-file.js";

type MetricFile = { metrics: MetricSample[] };

export type MetricRepository = {
  list(): Promise<MetricSample[]>;
  append(sample: MetricSample): Promise<MetricSample>;
};

export function createJsonMetricRepository(filePath = "data/metrics.json"): MetricRepository {
  return {
    async list() {
      return (await readJsonFile<MetricFile>(filePath, { metrics: [] })).metrics;
    },
    async append(sample) {
      const data = await readJsonFile<MetricFile>(filePath, { metrics: [] });
      data.metrics.push(sample);
      await writeJsonFile(filePath, data);
      return sample;
    }
  };
}
