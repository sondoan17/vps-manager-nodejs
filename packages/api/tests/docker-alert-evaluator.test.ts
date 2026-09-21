import { describe, expect, it } from "vitest";
import {
  DOCKER_UNAVAILABLE_RULE_KIND,
  DOCKER_UNAVAILABLE_RULE_VERSION,
  DOCKER_UNAVAILABLE_SEVERITY,
  buildDockerUnavailableSummary,
  classifyDockerUnavailableObservation,
  createInitialDockerUnavailableState,
  dockerUnavailableFingerprint,
  evaluateDockerUnavailable,
  type DockerUnavailableObservation,
  type DockerUnavailableState,
  createInitialDockerAlertState,
  evaluateDockerAlert,
  type DockerAlertObservation,
  type DockerTypedAlertState,
} from "../src/docker/docker-alert-evaluator.js";

const AVAILABLE: DockerUnavailableObservation = { availability: "available", observedAt: "2026-01-01T00:00:00.000Z" };
const UNAVAILABLE: DockerUnavailableObservation = { availability: "unavailable", observedAt: "2026-01-01T00:00:00.000Z" };
const UNKNOWN: DockerUnavailableObservation = { availability: "unknown", observedAt: "2026-01-01T00:00:00.000Z" };

function obs(partial: Partial<DockerUnavailableObservation> & { observedAt: string }): DockerUnavailableObservation {
  return { ...partial };
}

function feed(state: DockerUnavailableState, signals: DockerUnavailableObservation[]): DockerUnavailableState {
  let current = state;
  for (const signal of signals) {
    current = evaluateDockerUnavailable(current, signal).next;
  }
  return current;
}

describe("docker_unavailable evaluator", () => {
  it("exposes typed rule identity: warning severity and versioned rule kind", () => {
    expect(DOCKER_UNAVAILABLE_RULE_KIND).toBe("docker_unavailable");
    expect(DOCKER_UNAVAILABLE_RULE_VERSION).toBe(1);
    expect(DOCKER_UNAVAILABLE_SEVERITY).toBe("warning");
    expect(dockerUnavailableFingerprint("vps-1")).toBe("docker_unavailable:v1:vps-1");
    expect(buildDockerUnavailableSummary(3, 5)).toContain("3 of last 5");
  });

  it("opens after 3 unavailable complete observations within a 5-observation window", () => {
    let state = createInitialDockerUnavailableState("vps-1");
    const at = (n: number) => obs({ availability: "unavailable", observedAt: `2026-01-01T00:00:0${n}.000Z` });

    const r1 = evaluateDockerUnavailable(state, at(1));
    expect(r1.transition).toBe("no_change");
    expect(r1.next.alert).toBeNull();
    expect(r1.ruleKind).toBe("docker_unavailable");
    expect(r1.ruleVersion).toBe(1);
    expect(r1.severity).toBe("warning");

    state = r1.next;
    state = evaluateDockerUnavailable(state, at(2)).next;
    expect(state.alert).toBeNull();

    const r3 = evaluateDockerUnavailable(state, at(3));
    expect(r3.transition).toBe("opened");
    expect(r3.next.alert).toMatchObject({
      state: "open",
      openedAt: "2026-01-01T00:00:03.000Z",
      lastObservedAt: "2026-01-01T00:00:03.000Z",
      occurrences: 1,
    });
    expect(r3.unavailableCount).toBe(3);
  });

  it("requires 3 unavailable within the 5-slot window (interleaved available delays opening)", () => {
    let state = createInitialDockerUnavailableState("vps-1");
    const seq = (availability: "available" | "unavailable", n: number) =>
      obs({ availability, observedAt: `2026-01-01T00:00:${String(n).padStart(2, "0")}.000Z` });

    // Window: [U, U, A, A] -> only 2 unavailable, still closed.
    state = feed(state, [seq("unavailable", 1), seq("unavailable", 2), seq("available", 3), seq("available", 4)]);
    expect(state.alert).toBeNull();
    expect(state.window).toEqual(["unavailable", "unavailable", "available", "available"]);

    // Fifth: window [U, U, A, A, U] -> 3 unavailable, opens.
    const opened = evaluateDockerUnavailable(state, seq("unavailable", 5));
    expect(opened.transition).toBe("opened");
    expect(opened.next.alert?.state).toBe("open");

    // Sliding window: oldest unavailable ages out. [A, A, U, A, A] never opens.
    let fresh = createInitialDockerUnavailableState("vps-2");
    fresh = feed(fresh, [
      seq("unavailable", 1),
      seq("available", 2),
      seq("available", 3),
      seq("available", 4),
      seq("available", 5),
      seq("available", 6),
    ]);
    expect(fresh.alert).toBeNull();
    expect(fresh.window).toEqual(["available", "available", "available", "available", "available"]);
  });

  it("resolves after 3 available complete observations while open", () => {
    let state = createInitialDockerUnavailableState("vps-1");
    state = feed(state, [UNAVAILABLE, UNAVAILABLE, UNAVAILABLE]);
    expect(state.alert?.state).toBe("open");

    // One available: window keeps alert open.
    let result = evaluateDockerUnavailable(state, AVAILABLE);
    expect(result.transition).toBe("no_change");
    expect(result.next.alert?.state).toBe("open");

    result = evaluateDockerUnavailable(result.next, AVAILABLE);
    expect(result.transition).toBe("no_change");
    expect(result.next.alert?.state).toBe("open");

    result = evaluateDockerUnavailable(result.next, AVAILABLE);
    expect(result.transition).toBe("resolved");
    expect(result.next.alert).toBeNull();

    // After resolution, a fresh alert can open again.
    const reopened = feed(result.next, [UNAVAILABLE, UNAVAILABLE, UNAVAILABLE]);
    expect(reopened.alert?.state).toBe("open");
    expect(reopened.alert?.occurrences).toBe(1);
  });

  it("freezes on unknown/missing/stale/partial/gap without resetting counters", () => {
    let state = createInitialDockerUnavailableState("vps-1");
    state = feed(state, [UNAVAILABLE, UNAVAILABLE]);
    const windowBefore = [...state.window];

    const freezes: Array<DockerUnavailableObservation | null | undefined> = [
      UNKNOWN,
      { availability: undefined, observedAt: "2026-01-01T00:00:10.000Z" },
      null,
      undefined,
      obs({ availability: "unavailable", stale: true, observedAt: "2026-01-01T00:00:11.000Z" }),
      obs({ availability: "unavailable", complete: false, observedAt: "2026-01-01T00:00:12.000Z" }),
      obs({ availability: "unavailable", gap: true, observedAt: "2026-01-01T00:00:13.000Z" }),
    ];
    for (const frozen of freezes) {
      const result = evaluateDockerUnavailable(state, frozen);
      expect(result.transition).toBe("frozen");
      expect(result.next.window).toEqual(windowBefore);
      expect(result.next.alert).toBeNull();
      state = result.next;
    }

    // Counters preserved: one more complete unavailable opens.
    const opened = evaluateDockerUnavailable(state, UNAVAILABLE);
    expect(opened.transition).toBe("opened");
    expect(opened.next.alert?.state).toBe("open");
  });

  it("freezes an active alert on unknown without resolving or persisting", () => {
    let state = createInitialDockerUnavailableState("vps-1");
    state = feed(state, [UNAVAILABLE, UNAVAILABLE, UNAVAILABLE]);
    const active = state.alert!;
    expect(active.state).toBe("open");

    const frozen = evaluateDockerUnavailable(state, UNKNOWN);
    expect(frozen.transition).toBe("frozen");
    expect(frozen.next.alert).toEqual(active);
    expect(frozen.next.window).toEqual(state.window);

    // The alert still persists on the next complete unavailable.
    const persisted = evaluateDockerUnavailable(frozen.next, UNAVAILABLE);
    expect(persisted.transition).toBe("persisted");
    expect(persisted.next.alert).toMatchObject({ state: "open", occurrences: active.occurrences + 1 });
  });

  it("keeps acknowledged alerts acknowledged on persistence", () => {
    let state = createInitialDockerUnavailableState("vps-1");
    state = feed(state, [UNAVAILABLE, UNAVAILABLE, UNAVAILABLE]);
    const acknowledged: DockerUnavailableState = {
      ...state,
      alert: { ...state.alert!, state: "acknowledged", acknowledgedAt: "2026-01-01T00:01:00.000Z", acknowledgedBy: "dashboard" },
    };

    const result = evaluateDockerUnavailable(acknowledged, UNAVAILABLE);
    expect(result.transition).toBe("acknowledged_persisted");
    expect(result.next.alert).toMatchObject({
      state: "acknowledged",
      acknowledgedBy: "dashboard",
      occurrences: acknowledged.alert!.occurrences + 1,
    });

    // Acknowledged alerts still resolve on 3 available complete observations.
    let current = result.next;
    current = evaluateDockerUnavailable(current, AVAILABLE).next;
    current = evaluateDockerUnavailable(current, AVAILABLE).next;
    const resolved = evaluateDockerUnavailable(current, AVAILABLE);
    expect(resolved.transition).toBe("resolved");
    expect(resolved.next.alert).toBeNull();
  });

  it("classifies observations and never mutates the input state", () => {
    expect(classifyDockerUnavailableObservation(AVAILABLE)).toBe("available");
    expect(classifyDockerUnavailableObservation(UNAVAILABLE)).toBe("unavailable");
    expect(classifyDockerUnavailableObservation(UNKNOWN)).toBeNull();
    expect(classifyDockerUnavailableObservation(null)).toBeNull();
    expect(classifyDockerUnavailableObservation(undefined)).toBeNull();
    expect(classifyDockerUnavailableObservation({ ...UNAVAILABLE, complete: false })).toBeNull();
    expect(classifyDockerUnavailableObservation({ ...UNAVAILABLE, stale: true })).toBeNull();
    expect(classifyDockerUnavailableObservation({ ...UNAVAILABLE, gap: true })).toBeNull();

    const prev = createInitialDockerUnavailableState("vps-1");
    const snapshot = JSON.parse(JSON.stringify(prev)) as DockerUnavailableState;
    evaluateDockerUnavailable(prev, UNAVAILABLE);
    expect(prev).toEqual(snapshot);
  });
});

describe("typed Docker alert lifecycle parity", () => {
  const base = (extra: Partial<DockerAlertObservation> = {}): DockerAlertObservation => ({
    vpsId: "vps-1", agentInstanceId: "agent-1", containerKey: "container-1",
    observedAt: "2026-01-01T00:00:00Z", status: "complete", exactContainer: true, ...extra,
  });
  const feed = (state: DockerTypedAlertState, observations: DockerAlertObservation[]) =>
    observations.reduce((current, observation) => evaluateDockerAlert(current, observation).next, state);

  it("applies hysteresis and cooldown before reopening", () => {
    let state = createInitialDockerAlertState("container_cpu_high", { vpsId: "vps-1", agentInstanceId: "agent-1", containerKey: "container-1" });
    const high = (n: number) => base({ observedAt: `2026-01-01T00:00:${String(n).padStart(2, "0")}Z`, cpuRatio: 0.95 });
    const low = (n: number) => base({ observedAt: `2026-01-01T00:00:${String(n).padStart(2, "0")}Z`, cpuRatio: 0.79 });
    state = feed(state, [high(1), high(2), high(3)]);
    state = feed(state, [low(4), low(5), low(6)]);
    expect(state.alert).toBeNull();
    expect(state.cooldownRemaining).toBe(2);
    state = feed(state, [high(7), high(8)]);
    expect(state.alert).toBeNull();
    state = feed(state, [high(9), high(10), high(11)]);
    expect(state.alert?.state).toBe("open");
  });

  it("freezes gaps and resolves restart loops after three healthy quiet ticks", () => {
    let state = createInitialDockerAlertState("container_restart_loop", { vpsId: "vps-1", agentInstanceId: "agent-1", containerKey: "container-1" });
    const restart = (n: number) => base({ observedAt: `2026-01-01T00:00:${String(n).padStart(2, "0")}Z`, eventAction: "restart" });
    state = feed(state, [restart(1), restart(2), restart(3)]);
    const frozen = evaluateDockerAlert(state, base({ status: "gap", eventAction: "restart" }));
    expect(frozen.transition).toBe("frozen");
    state = feed(frozen.next, [base({ health: "healthy", healthySample: true }), base({ health: "healthy", healthySample: true }), base({ health: "healthy", healthySample: true })]);
    expect(state.alert).toBeNull();
  });

  it("uses explicit removal and baseline reset resolutions", () => {
    let state = createInitialDockerAlertState("container_unhealthy", { vpsId: "vps-1", agentInstanceId: "agent-1", containerKey: "container-1" });
    state = feed(state, [base({ health: "unhealthy" })]);
    const removed = evaluateDockerAlert(state, base({ eventAction: "destroy" }));
    expect(removed).toMatchObject({ transition: "resolved_container_removed", resolution: "container_removed" });
    let gapState = createInitialDockerAlertState("docker_event_gap", { vpsId: "vps-1" });
    gapState = feed(gapState, [base({ agentInstanceId: null, gapReason: "stream_gap" })]);
    const reset = evaluateDockerAlert(gapState, base({ agentInstanceId: null, baselineReset: true }));
    expect(reset).toMatchObject({ transition: "resolved_baseline", resolution: "baseline_reset" });
  });
});
