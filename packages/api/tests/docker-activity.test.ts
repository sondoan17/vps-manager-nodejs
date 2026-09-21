import { describe, expect, it, vi } from "vitest";
import {
  DockerActivityService,
  DockerInvalidationCoalescer,
  DOCKER_INVALIDATION_FRAME_MAX_BYTES,
  DOCKER_INVALIDATION_MAX_ALERT_IDS,
  DOCKER_INVALIDATION_MAX_VPS_IDS,
} from "../src/docker/docker-activity.service.js";

describe("DockerInvalidationCoalescer", () => {
  it("deduplicates events, merges and sorts alerts, and preserves the newest event payload", () => {
    // Arrange: repeated activity for one VPS should collapse into one deterministic payload.
    const coalescer = new DockerInvalidationCoalescer();
    coalescer.add({ type: "docker.events.available", vpsId: "v2", newestEventId: "old", countHint: 1 });
    coalescer.add({ type: "docker.events.available", vpsId: "v2", newestEventId: "new", countHint: 2, truncated: true });
    coalescer.add({ type: "docker.alerts.updated", vpsId: "v2", changedAlertIds: ["z", "a"] });
    coalescer.add({ type: "docker.alerts.updated", vpsId: "v2", changedAlertIds: ["a", "b"], refreshRequired: true });
    coalescer.add({ type: "docker.events.available", vpsId: "v1" });

    // Act
    const result = coalescer.flush();

    // Assert: objective covers event dedupe plus merged/sorted alert IDs and VPS ordering.
    expect(result).toEqual({
      vpsIds: ["v1", "v2"],
      events: [
        { type: "docker.events.available", vpsId: "v1" },
        { type: "docker.events.available", vpsId: "v2", newestEventId: "new", countHint: 2, truncated: true },
      ],
      alerts: [{ vpsId: "v2", changedAlertIds: ["a", "b", "z"], refreshRequired: true }],
      refreshRequired: false,
    });
  });

  it("caps VPS and alert cardinality and signals overflow refresh", () => {
    // Arrange: fill both bounded collections, then submit one item beyond each limit.
    const coalescer = new DockerInvalidationCoalescer();
    for (let i = 0; i < DOCKER_INVALIDATION_MAX_VPS_IDS; i++) {
      coalescer.add({ type: "docker.events.available", vpsId: `vps-${i}` });
    }
    coalescer.add({ type: "docker.events.available", vpsId: "vps-overflow" });
    const alertCoalescer = new DockerInvalidationCoalescer();
    alertCoalescer.add({ type: "docker.alerts.updated", vpsId: "vps", changedAlertIds: Array.from({ length: DOCKER_INVALIDATION_MAX_ALERT_IDS }, (_, i) => `a-${i}`) });
    alertCoalescer.add({ type: "docker.alerts.updated", vpsId: "vps", changedAlertIds: ["a-overflow"] });

    // Act
    const vpsResult = coalescer.flush();
    const alertResult = alertCoalescer.flush();

    // Assert: negative overflow behavior is refreshRequired while limits remain hard bounded.
    expect(vpsResult?.vpsIds).toHaveLength(DOCKER_INVALIDATION_MAX_VPS_IDS);
    expect(vpsResult?.refreshRequired).toBe(true);
    expect(alertResult?.alerts[0].changedAlertIds).toHaveLength(DOCKER_INVALIDATION_MAX_ALERT_IDS);
    expect(alertResult?.refreshRequired).toBe(true);
  });

  it("filters by scope, emits a bounded frame, and becomes inert after teardown", () => {
    // Arrange
    const coalescer = new DockerInvalidationCoalescer({ vpsId: "allowed" });
    coalescer.add({ type: "docker.events.available", vpsId: "ignored" });
    coalescer.add({ type: "docker.alerts.updated", vpsId: "allowed", changedAlertIds: ["x".repeat(50_000)] });

    // Act
    const frame = coalescer.flushFrame();
    coalescer.add({ type: "docker.events.available", vpsId: "allowed" });
    coalescer.teardown();

    // Assert: scope filtering and the frame cap are positive guarantees; teardown is safe negative behavior.
    expect(frame).not.toBeNull();
    expect(Buffer.byteLength(frame!, "utf8")).toBeLessThanOrEqual(DOCKER_INVALIDATION_FRAME_MAX_BYTES);
    expect(frame).toContain('"refreshRequired":true');
    expect(coalescer.flush()).toBeNull();
    expect(coalescer.flushFrame()).toBeNull();
  });
});

describe("DockerActivityService", () => {
  it("delivers to healthy subscribers while isolating publisher failures", () => {
    // Arrange
    const service = new DockerActivityService();
    const failing = vi.fn(() => { throw new Error("subscriber failure"); });
    const healthy = vi.fn();
    service.subscribe(failing);
    service.subscribe(healthy);

    // Act
    const activity = { type: "docker.events.available" as const, vpsId: "vps-1" };
    service.publish(activity);

    // Assert: one subscriber's failure must not block another subscriber.
    expect(failing).toHaveBeenCalledWith(activity);
    expect(healthy).toHaveBeenCalledWith(activity);
  });

  it("stops delivery after unsubscribe and tolerates repeated teardown", () => {
    // Arrange
    const service = new DockerActivityService();
    const listener = vi.fn();
    const unsubscribe = service.subscribe(listener);

    // Act
    unsubscribe();
    unsubscribe();
    service.publish({ type: "docker.alerts.updated", vpsId: "vps-1", changedAlertIds: ["alert-1"] });

    // Assert: unsubscribe/teardown safety prevents post-removal delivery.
    expect(listener).not.toHaveBeenCalled();
  });
});
