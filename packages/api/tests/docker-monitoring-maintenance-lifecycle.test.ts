import { describe, expect, it, vi, afterEach } from "vitest";
import { Logger } from "@nestjs/common";
import { DockerMonitoringMaintenanceService } from "../src/docker/docker-monitoring-maintenance.service.js";

const config = (mode: "demo" | "local" = "local") => ({ mode, dockerMaintenanceIntervalSeconds: 1 } as never);

afterEach(() => vi.useRealTimers());

describe("DockerMonitoringMaintenanceService", () => {
  it("runs once on bootstrap and continues ticking", async () => {
    vi.useFakeTimers();
    const runMaintenance = vi.fn(async () => ({}));
    const service = new DockerMonitoringMaintenanceService(config(), { runMaintenance } as never);
    service.onApplicationBootstrap();
    await vi.waitFor(() => expect(runMaintenance).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(1000);
    expect(runMaintenance).toHaveBeenCalledTimes(2);
    await service.onApplicationShutdown();
  });

  it("does not overlap runs", async () => {
    vi.useFakeTimers();
    let release!: () => void;
    const runMaintenance = vi.fn(() => new Promise<void>((resolve) => { release = resolve; }));
    const service = new DockerMonitoringMaintenanceService(config(), { runMaintenance } as never);
    service.onApplicationBootstrap();
    await vi.waitFor(() => expect(runMaintenance).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(1000);
    expect(runMaintenance).toHaveBeenCalledTimes(1);
    release();
    await service.onApplicationShutdown();
  });

  it("logs and swallows errors, then cleans up on shutdown", async () => {
    vi.useFakeTimers();
    const loggerError = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    const runMaintenance = vi.fn(async () => { throw new Error("failed"); });
    const service = new DockerMonitoringMaintenanceService(config(), { runMaintenance } as never);
    service.onApplicationBootstrap();
    await vi.waitFor(() => expect(runMaintenance).toHaveBeenCalledTimes(1));
    await service.onApplicationShutdown();
    await vi.advanceTimersByTimeAsync(3000);
    expect(runMaintenance).toHaveBeenCalledTimes(1);
    expect(loggerError).toHaveBeenCalledWith("runMaintenance failed", expect.stringContaining("failed"));
    loggerError.mockRestore();
  });

  it("reports successful maintenance telemetry", async () => {
    const runMaintenance = vi.fn(async () => ({ samplesRemoved: 3, eventsRemoved: 2, durationMs: 8 }));
    const service = new DockerMonitoringMaintenanceService(config(), { runMaintenance } as never);
    await service.runOnce();
    expect(service.getHealth()).toMatchObject({ status: "healthy", runs: 1, failures: 0, lastResult: { samplesRemoved: 3, eventsRemoved: 2 } });
  });

  it("reports failed maintenance telemetry without throwing", async () => {
    const runMaintenance = vi.fn(async () => { throw new Error("database unavailable"); });
    const service = new DockerMonitoringMaintenanceService(config(), { runMaintenance } as never);
    const loggerError = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    await service.runOnce();
    expect(service.getHealth()).toMatchObject({ status: "degraded", runs: 1, failures: 1, lastError: "database unavailable" });
    loggerError.mockRestore();
  });

  it("does not run in demo mode", async () => {
    vi.useFakeTimers();
    const runMaintenance = vi.fn(async () => ({}));
    const service = new DockerMonitoringMaintenanceService(config("demo"), { runMaintenance } as never);
    service.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(2000);
    expect(runMaintenance).not.toHaveBeenCalled();
  });

  it("waits for an in-flight run during shutdown", async () => {
    let release!: () => void;
    const runMaintenance = vi.fn(() => new Promise<void>((resolve) => { release = resolve; }));
    const service = new DockerMonitoringMaintenanceService(config(), { runMaintenance } as never);
    service.onApplicationBootstrap();
    await vi.waitFor(() => expect(runMaintenance).toHaveBeenCalledTimes(1));
    let shutdownComplete = false;
    const shutdown = service.onApplicationShutdown().then(() => { shutdownComplete = true; });
    await Promise.resolve();
    expect(shutdownComplete).toBe(false);
    release();
    await shutdown;
    expect(shutdownComplete).toBe(true);
  });
});
