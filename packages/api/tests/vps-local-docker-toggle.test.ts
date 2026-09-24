import { describe, expect, it, vi } from "vitest";
import type { AppConfig } from "../src/config/app-config.js";
import type { AgentRepository } from "../src/persistence/repositories/agent.repository.js";
import type { VpsRepository } from "../src/persistence/repositories/vps.repository.js";
import type { VpsRecord } from "../src/vps/vps.models.js";
import { VpsService } from "../src/vps/vps.service.js";

const localVps: VpsRecord = {
  id: "vps_local_host",
  name: "Local host",
  host: "127.0.0.1",
  port: 22,
  username: "root",
  kind: "local",
  managedBy: "system",
  dockerMetricsEnabled: false,
  createdAt: "2026-09-17T00:00:00.000Z",
  updatedAt: "2026-09-17T00:00:00.000Z",
};

function arrangeService() {
  const update = vi.fn(async (_id: string, patch: { dockerMetricsEnabled?: boolean }) => ({
    ...localVps,
    ...patch,
  }));
  const store = {
    get: vi.fn(async () => localVps),
    update,
  } as unknown as VpsRepository;
  const audit = { record: vi.fn(async () => undefined) };
  const agentRepository = {
    getState: vi.fn(async () => undefined),
  } as unknown as AgentRepository;
  const config = { mode: "local" } as AppConfig;
  const service = new VpsService(
    store,
    {} as never,
    {} as never,
    audit as never,
    config,
    {} as never,
    {} as never,
    agentRepository,
    {} as never,
  );

  return { service, update, audit, agentRepository };
}

describe("local/system VPS Docker metrics updates", () => {
  it("accepts the exact dockerMetricsEnabled boolean patch", async () => {
    // Objective (positive): local/system VPS may toggle Docker metrics when the
    // request contains exactly the supported boolean field.
    // Arrange
    const { service, update, audit } = arrangeService();

    // Act
    const result = await service.update(localVps.id, {
      dockerMetricsEnabled: true,
    });

    // Assert
    expect(result.dockerMetricsEnabled).toBe(true);
    expect(update).toHaveBeenCalledWith(localVps.id, {
      dockerMetricsEnabled: true,
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "vps.docker_metrics.update" }),
    );
  });

  it("rejects a Docker toggle patch containing an unrelated field", async () => {
    // Objective (negative): local/system VPS updates must reject extra fields,
    // while preserving the valid exact-toggle behavior covered above.
    // Arrange
    const { service, update, audit } = arrangeService();

    // Act
    const action = service.update(localVps.id, {
      dockerMetricsEnabled: true,
      name: "not-allowed",
    });

    // Assert
    await expect(action).rejects.toMatchObject({ name: "ZodError" });
    expect(update).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });
});
