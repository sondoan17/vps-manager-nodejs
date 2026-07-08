import { Body, Controller, Inject, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import type { AgentMetricPayload } from "./agent.models.js";
import { AgentService, type IngestMetricResult } from "./agent.service.js";

/**
 * Extended response for successful metric ingest.
 * Returns runtime config so the agent can learn dashboard intent.
 * Never exposes credential ids or token details.
 */
type AgentIngestResponse = {
  data: {
    ok: true;
    vpsId: string;
    receivedAt: string;
    config: {
      dockerMetricsEnabled: boolean;
    };
  };
};

@Controller("api/agent")
export class AgentController {
  constructor(
    @Inject(AgentService) private readonly agentService: AgentService,
  ) {}

  /**
   * POST /api/agent/metrics
   *
   * Accepts agent metric payloads authenticated via Bearer token.
   * Token format: vma_<credentialId>_<secret>
   */
  @Post("metrics")
  async ingestMetrics(
    @Req() req: Request,
    @Body() body: AgentMetricPayload,
  ): Promise<AgentIngestResponse> {
    // 1. Authenticate via bearer token
    const authHeader = req.header("authorization");
    const credential = await this.agentService.verifyBearerToken(authHeader);

    // 2. Ingest the metric payload
    // ZodError from schema validation propagates to the global exception filter
    // and results in a 400 Bad Request.
    const { sample, config } = await this.agentService.ingestMetric(
      credential,
      body,
      req.ip,
    );

    return {
      data: {
        ok: true,
        vpsId: sample.vpsId,
        receivedAt: sample.receivedAt!,
        config,
      },
    };
  }
}
