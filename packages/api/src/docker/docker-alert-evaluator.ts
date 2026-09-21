/**
 * Pure deterministic evaluator core for the `docker_unavailable` alert rule.
 *
 * Policy (versioned, warning severity):
 * - 3 `unavailable` complete observations within a 5-observation window opens.
 * - 3 `available` complete observations within a 5-observation window resolves.
 * - `unknown` / missing / stale / partial / gap observations freeze: they do
 *   not enter the window, do not reset counters, and leave the alert untouched.
 * - `acknowledged` stays `acknowledged` on persistence: continued
 *   `unavailable` observations while acknowledged bump occurrences but never
 *   flip the state back to `open`.
 *
 * This module is intentionally pure: no I/O, no clocks, no randomness. The
 * caller supplies the prior state and the current observation (including its
 * `observedAt` timestamp); the evaluator returns the next state plus a
 * transition descriptor. Repositories, ingest, controllers, and UI are
 * deliberately untouched.
 */

export const DOCKER_UNAVAILABLE_RULE_KIND = "docker_unavailable" as const;
export const DOCKER_UNAVAILABLE_RULE_VERSION = 1 as const;
export const DOCKER_UNAVAILABLE_SEVERITY = "warning" as const;

export const DOCKER_UNAVAILABLE_WINDOW_SIZE = 5 as const;
export const DOCKER_UNAVAILABLE_OPEN_THRESHOLD = 3 as const;
export const DOCKER_UNAVAILABLE_RESOLVE_THRESHOLD = 3 as const;

export type DockerUnavailableCompleteSignal = "available" | "unavailable";
export type DockerUnavailableRawAvailability = "available" | "unavailable" | "unknown";

/**
 * Single observation fed to the evaluator.
 *
 * - `availability`: reported docker availability. `undefined`/`null` means the
 *   observation is missing.
 * - `complete`: `false` marks a partial observation (for example an incomplete
 *   coverage sample). Defaults to `true` when omitted.
 * - `stale`: `true` marks a stale observation (derived freshness, old
 *   sequence, etc.). Defaults to `false` when omitted.
 * - `gap`: `true` marks a gap observation (stream gap, missing batch, ...).
 *   Defaults to `false` when omitted.
 * - `observedAt`: ISO datetime string used for `openedAt`/`lastObservedAt`/
 *   `resolvedAt` bookkeeping. No clock is read inside the evaluator.
 */
export type DockerUnavailableObservation = {
  availability?: DockerUnavailableRawAvailability | null;
  complete?: boolean;
  stale?: boolean;
  gap?: boolean;
  observedAt: string;
};

export type DockerUnavailableActiveAlert = {
  state: "open" | "acknowledged";
  openedAt: string;
  lastObservedAt: string;
  occurrences: number;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
};

export type DockerUnavailableState = {
  vpsId: string;
  /** Complete signals only, oldest-first, bounded to WINDOW_SIZE. */
  window: DockerUnavailableCompleteSignal[];
  /** `null` means no active alert (never opened or already resolved). */
  alert: DockerUnavailableActiveAlert | null;
};

export type DockerUnavailableTransition =
  | "opened"
  | "persisted"
  | "acknowledged_persisted"
  | "resolved"
  | "no_change"
  | "frozen";

export type DockerUnavailableResult = {
  next: DockerUnavailableState;
  transition: DockerUnavailableTransition;
  ruleKind: typeof DOCKER_UNAVAILABLE_RULE_KIND;
  ruleVersion: typeof DOCKER_UNAVAILABLE_RULE_VERSION;
  severity: typeof DOCKER_UNAVAILABLE_SEVERITY;
  /** Copy of the next window (oldest-first). */
  window: DockerUnavailableCompleteSignal[];
  unavailableCount: number;
  availableCount: number;
};

function isValidIsoDate(value: string): boolean {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function countSignals(window: DockerUnavailableCompleteSignal[]): { unavailableCount: number; availableCount: number } {
  let unavailableCount = 0;
  let availableCount = 0;
  for (const signal of window) {
    if (signal === "unavailable") unavailableCount += 1;
    else availableCount += 1;
  }
  return { unavailableCount, availableCount };
}

function baseResult(
  next: DockerUnavailableState,
  transition: DockerUnavailableTransition,
): DockerUnavailableResult {
  const { unavailableCount, availableCount } = countSignals(next.window);
  return {
    next,
    transition,
    ruleKind: DOCKER_UNAVAILABLE_RULE_KIND,
    ruleVersion: DOCKER_UNAVAILABLE_RULE_VERSION,
    severity: DOCKER_UNAVAILABLE_SEVERITY,
    window: [...next.window],
    unavailableCount,
    availableCount,
  };
}

function frozenResult(state: DockerUnavailableState): DockerUnavailableResult {
  const next: DockerUnavailableState = {
    vpsId: state.vpsId,
    window: [...state.window],
    alert: state.alert === null ? null : { ...state.alert },
  };
  return baseResult(next, "frozen");
}

/**
 * Returns the complete signal for an observation, or `null` when the
 * observation must freeze the evaluator (unknown/missing/stale/partial/gap).
 */
export function classifyDockerUnavailableObservation(
  observation: DockerUnavailableObservation | null | undefined,
): DockerUnavailableCompleteSignal | null {
  if (observation === null || observation === undefined) return null;
  if (observation.stale === true) return null;
  if (observation.gap === true) return null;
  if (observation.complete === false) return null;
  if (observation.availability === "available" || observation.availability === "unavailable") {
    return observation.availability;
  }
  return null;
}

/** Returns true when the observation is complete and carries a usable signal. */
export function isCompleteDockerUnavailableObservation(
  observation: DockerUnavailableObservation | null | undefined,
): boolean {
  return classifyDockerUnavailableObservation(observation) !== null;
}

export function createInitialDockerUnavailableState(vpsId: string): DockerUnavailableState {
  if (typeof vpsId !== "string" || vpsId.length === 0) {
    throw new Error("vpsId must be a non-empty string");
  }
  return { vpsId, window: [], alert: null };
}

/** Deterministic fingerprint for the host-level `docker_unavailable` alert. */
export function dockerUnavailableFingerprint(vpsId: string): string {
  return `${DOCKER_UNAVAILABLE_RULE_KIND}:v${DOCKER_UNAVAILABLE_RULE_VERSION}:${vpsId}`;
}

/** Deterministic human-readable summary for alert payloads. */
export function buildDockerUnavailableSummary(unavailableCount: number, windowSize: number): string {
  return `docker unavailable: ${unavailableCount} of last ${windowSize} complete observations unavailable`;
}

/**
 * Advance the evaluator by one observation. Pure and deterministic: the input
 * state is never mutated; the returned `next` state is a fresh object.
 */
export function evaluateDockerUnavailable(
  prev: DockerUnavailableState,
  observation: DockerUnavailableObservation | null | undefined,
): DockerUnavailableResult {
  if (prev === null || prev === undefined) {
    throw new Error("prev state is required");
  }
  if (typeof prev.vpsId !== "string" || prev.vpsId.length === 0) {
    throw new Error("prev.vpsId must be a non-empty string");
  }
  const prevWindow = Array.isArray(prev.window) ? prev.window : [];
  const signal = classifyDockerUnavailableObservation(observation);
  if (signal === null) {
    return frozenResult({ vpsId: prev.vpsId, window: [...prevWindow].slice(-DOCKER_UNAVAILABLE_WINDOW_SIZE), alert: prev.alert });
  }

  const observedAt = (observation as DockerUnavailableObservation).observedAt;
  if (!isValidIsoDate(observedAt)) {
    throw new Error("observation.observedAt must be a valid ISO datetime string");
  }

  const window: DockerUnavailableCompleteSignal[] = [...prevWindow, signal].slice(-DOCKER_UNAVAILABLE_WINDOW_SIZE);
  const { unavailableCount, availableCount } = countSignals(window);
  const active = prev.alert === null ? null : { ...prev.alert };

  // Active alert: resolve takes precedence (window cannot hold 3+ of both
  // signals in a 5-slot window, so open/resolve are mutually exclusive).
  if (active !== null) {
    if (availableCount >= DOCKER_UNAVAILABLE_RESOLVE_THRESHOLD) {
      const next: DockerUnavailableState = { vpsId: prev.vpsId, window, alert: null };
      return baseResult(next, "resolved");
    }
    if (signal === "unavailable") {
      const nextAlert: DockerUnavailableActiveAlert = {
        ...active,
        lastObservedAt: observedAt,
        occurrences: active.occurrences + 1,
      };
      const next: DockerUnavailableState = { vpsId: prev.vpsId, window, alert: nextAlert };
      const transition: DockerUnavailableTransition =
        active.state === "acknowledged" ? "acknowledged_persisted" : "persisted";
      return baseResult(next, transition);
    }
    // Active alert + complete `available` below the resolve threshold:
    // slide the window, leave the alert untouched.
    const next: DockerUnavailableState = { vpsId: prev.vpsId, window, alert: active };
    return baseResult(next, "no_change");
  }

  // No active alert: open when the window holds enough `unavailable` signals.
  if (unavailableCount >= DOCKER_UNAVAILABLE_OPEN_THRESHOLD) {
    const next: DockerUnavailableState = {
      vpsId: prev.vpsId,
      window,
      alert: {
        state: "open",
        openedAt: observedAt,
        lastObservedAt: observedAt,
        occurrences: 1,
      },
    };
    return baseResult(next, "opened");
  }

  const next: DockerUnavailableState = { vpsId: prev.vpsId, window, alert: null };
  return baseResult(next, "no_change");
}

// ── Phase 1 typed alert evidence (docs §5) ────────────────────────────────────
// Exact-evidence rules with unknown/gap freeze semantics. Unknown, stale,
// partial-coverage, aggregate-derived, identity-mismatched, and gap observations
// freeze: they never enter windows, never count as healthy/clear evidence, and
// never resolve. Container absence alone never resolves. Only an exact typed
// destroy/remove event resolves as container_removed. Thresholds below are
// versioned defaults pending product agreement; evidence admissibility is not
// configurable.
export type DockerAlertRuleKind =
  | "container_unhealthy"
  | "container_restart_loop"
  | "container_cpu_high"
  | "container_memory_high"
  | "docker_storage_pressure"
  | "docker_event_gap";
export type DockerAlertSeverity = "warning" | "critical";
export type DockerEvidenceStatus = "complete" | "unknown" | "gap";
export type DockerAlertSignal = "positive" | "negative" | "neutral" | "removed" | "baseline" | null;
export type DockerAlertTransition =
  | "opened"
  | "persisted"
  | "acknowledged_persisted"
  | "resolved"
  | "resolved_container_removed"
  | "resolved_baseline"
  | "no_change"
  | "frozen";
export type DockerAlertResolution = "condition_cleared" | "container_removed" | "baseline_reset" | null;
export type DockerAlertObservation = {
  observedAt: string;
  vpsId: string;
  agentInstanceId?: string | null;
  containerKey?: string | null;
  status?: DockerEvidenceStatus;
  stale?: boolean;
  gap?: boolean;
  partial?: boolean;
  complete?: boolean;
  exactContainer?: boolean;
  coverageComplete?: boolean;
  fromAggregate?: boolean;
  supported?: boolean;
  formulaVersion?: number;
  health?: "healthy" | "running" | "unhealthy" | "starting" | "unknown";
  healthySample?: boolean;
  eventAction?: "start" | "restart" | "die" | "destroy" | "remove" | "create" | "stop" | "kill" | "health_status";
  cpuRatio?: number;
  memoryRatio?: number;
  storageRatio?: number;
  gapReason?: string;
  gapFree?: boolean;
  baselineReset?: boolean;
};
export type DockerAlertActive = {
  state: "open" | "acknowledged";
  openedAt: string;
  lastObservedAt: string;
  occurrences: number;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
};
export type DockerTypedAlertState = {
  ruleKind: DockerAlertRuleKind;
  vpsId: string;
  agentInstanceId: string | null;
  containerKey: string | null;
  /** Recent complete signals, oldest-first, bounded per rule. */
  window: Array<"positive" | "negative" | "neutral">;
  /** Consecutive gap-free quiet ticks (restart_loop / event_gap clear runs). */
  quietCount: number;
  /** Complete observations remaining before a new open is allowed. */
  cooldownRemaining: number;
  alert: DockerAlertActive | null;
};
export type DockerTypedAlertResult = {
  next: DockerTypedAlertState;
  transition: DockerAlertTransition;
  resolution: DockerAlertResolution;
  ruleKind: DockerAlertRuleKind;
  ruleVersion: 1;
  severity: DockerAlertSeverity;
};

export const DOCKER_ALERT_RULE_VERSION = 1 as const;
export const DOCKER_ALERT_RULES = {
  container_unhealthy: { severity: "critical", open: 1, window: 1, clear: 3, cooldown: 2 },
  container_restart_loop: { severity: "warning", open: 3, window: 5, clearQuiet: 3, cooldown: 2 },
  container_cpu_high: { severity: "warning", open: 3, window: 5, clear: 3, openRatio: 0.9, clearRatio: 0.8, cooldown: 2 },
  container_memory_high: { severity: "warning", open: 3, window: 5, clear: 3, openRatio: 0.9, clearRatio: 0.8, cooldown: 2 },
  docker_storage_pressure: { severity: "warning", open: 1, window: 2, clear: 2, openRatio: 0.9, clearRatio: 0.85, cooldown: 2 },
  docker_event_gap: { severity: "warning", open: 1, window: 1, clearGapFree: 3, cooldown: 0 },
} as const;

function isContainerRule(ruleKind: DockerAlertRuleKind): boolean {
  return (
    ruleKind === "container_unhealthy" ||
    ruleKind === "container_restart_loop" ||
    ruleKind === "container_cpu_high" ||
    ruleKind === "container_memory_high"
  );
}

function identityMatches(state: DockerTypedAlertState, observation: DockerAlertObservation): boolean {
  if (observation.vpsId !== state.vpsId) return false;
  if (!isContainerRule(state.ruleKind) && state.ruleKind !== "docker_event_gap") return true;
  if (state.ruleKind === "docker_event_gap") {
    if (state.agentInstanceId === null) return true;
    return (observation.agentInstanceId ?? null) === state.agentInstanceId;
  }
  return (
    (observation.agentInstanceId ?? null) === state.agentInstanceId &&
    (observation.containerKey ?? null) === state.containerKey
  );
}

function isFrozenBase(observation: DockerAlertObservation | null | undefined): boolean {
  if (observation === null || observation === undefined) return true;
  if (observation.status === "unknown" || observation.status === "gap") return true;
  if (observation.status !== undefined && observation.status !== "complete") return true;
  if (observation.stale === true || observation.gap === true) return true;
  if (observation.partial === true || observation.complete === false) return true;
  return false;
}

function frozenAlertResult(prev: DockerTypedAlertState, severity: DockerAlertSeverity): DockerTypedAlertResult {
  const next: DockerTypedAlertState = {
    ...prev,
    window: [...prev.window],
    alert: prev.alert === null ? null : { ...prev.alert },
  };
  return { next, transition: "frozen", resolution: null, ruleKind: prev.ruleKind, ruleVersion: 1, severity };
}

export function createInitialDockerAlertState(
  ruleKind: DockerAlertRuleKind,
  ids: { vpsId: string; agentInstanceId?: string | null; containerKey?: string | null },
): DockerTypedAlertState {
  if (typeof ids.vpsId !== "string" || ids.vpsId.length === 0) throw new Error("vpsId must be a non-empty string");
  const needsContainer = isContainerRule(ruleKind);
  const agentInstanceId = ids.agentInstanceId ?? null;
  const containerKey = ids.containerKey ?? null;
  if (needsContainer && (agentInstanceId === null || containerKey === null)) {
    throw new Error(`${ruleKind} requires agentInstanceId and containerKey`);
  }
  return { ruleKind, vpsId: ids.vpsId, agentInstanceId, containerKey, window: [], quietCount: 0, cooldownRemaining: 0, alert: null };
}

/** Deterministic fingerprint: ruleKind:v<version>:vpsId:instance-or-host:container-or-host. */
export function dockerAlertFingerprint(
  vpsId: string,
  ruleKind: DockerAlertRuleKind,
  agentInstanceId?: string | null,
  containerKey?: string | null,
): string {
  return `${ruleKind}:v${DOCKER_ALERT_RULE_VERSION}:${vpsId}:${agentInstanceId ?? "host"}:${containerKey ?? "host"}`;
}

export function buildDockerAlertSummary(ruleKind: DockerAlertRuleKind, detail: string): string {
  return `${ruleKind}: ${detail}`;
}

function classifyRemoval(observation: DockerAlertObservation): boolean {
  return (
    observation.exactContainer !== false &&
    (observation.eventAction === "destroy" || observation.eventAction === "remove")
  );
}

export function classifyContainerUnhealthyObservation(observation: DockerAlertObservation | null | undefined): DockerAlertSignal {
  if (observation === null || observation === undefined || isFrozenBase(observation)) return null;
  if (observation.exactContainer === false) return null;
  if (classifyRemoval(observation)) return "removed";
  if (observation.health === "unhealthy") return "positive";
  if (observation.health === "healthy" || observation.health === "running") return "negative";
  return null;
}

export function classifyRestartLoopObservation(observation: DockerAlertObservation | null | undefined): DockerAlertSignal {
  if (observation === null || observation === undefined || isFrozenBase(observation)) return null;
  if (observation.exactContainer === false) return null;
  if (classifyRemoval(observation)) return "removed";
  if (observation.eventAction === "start" || observation.eventAction === "restart" || observation.eventAction === "die") {
    return "positive";
  }
  if (observation.healthySample === true || observation.health === "healthy" || observation.health === "running") {
    return "negative";
  }
  // Complete gap-free tick with no restart event counts as quiet (negative).
  if (observation.eventAction === undefined && observation.health === undefined) return "negative";
  return null;
}

function classifyRatioObservation(
  observation: DockerAlertObservation | null | undefined,
  ratio: number | undefined,
  openRatio: number,
  clearRatio: number,
): DockerAlertSignal {
  if (observation === null || observation === undefined || isFrozenBase(observation)) return null;
  if (observation.exactContainer === false) return null;
  if (observation.fromAggregate === true) return null;
  if (observation.coverageComplete === false) return null;
  if (classifyRemoval(observation)) return "removed";
  if (typeof ratio !== "number" || !Number.isFinite(ratio)) return null;
  if (ratio >= openRatio) return "positive";
  if (ratio < clearRatio) return "negative";
  return "neutral";
}

export function classifyCpuHighObservation(observation: DockerAlertObservation | null | undefined): DockerAlertSignal {
  if (observation === null || observation === undefined) return null;
  return classifyRatioObservation(
    observation,
    observation.cpuRatio,
    DOCKER_ALERT_RULES.container_cpu_high.openRatio,
    DOCKER_ALERT_RULES.container_cpu_high.clearRatio,
  );
}

export function classifyMemoryHighObservation(observation: DockerAlertObservation | null | undefined): DockerAlertSignal {
  if (observation === null || observation === undefined) return null;
  return classifyRatioObservation(
    observation,
    observation.memoryRatio,
    DOCKER_ALERT_RULES.container_memory_high.openRatio,
    DOCKER_ALERT_RULES.container_memory_high.clearRatio,
  );
}

export function classifyStoragePressureObservation(observation: DockerAlertObservation | null | undefined): DockerAlertSignal {
  if (observation === null || observation === undefined || isFrozenBase(observation)) return null;
  if (observation.supported === false) return null;
  if (observation.formulaVersion !== DOCKER_ALERT_RULE_VERSION) return null;
  const ratio = observation.storageRatio;
  if (typeof ratio !== "number" || !Number.isFinite(ratio)) return null;
  if (ratio >= DOCKER_ALERT_RULES.docker_storage_pressure.openRatio) return "positive";
  if (ratio < DOCKER_ALERT_RULES.docker_storage_pressure.clearRatio) return "negative";
  return "neutral";
}

export function classifyEventGapObservation(observation: DockerAlertObservation | null | undefined): DockerAlertSignal {
  if (observation === null || observation === undefined) return null;
  if (typeof observation.observedAt !== "string" || Number.isNaN(Date.parse(observation.observedAt))) return null;
  if (observation.baselineReset === true) return "baseline";
  if (typeof observation.gapReason === "string" && observation.gapReason.length > 0) return "positive";
  if (observation.status === "complete" && observation.gapFree === true) return "negative";
  return null;
}

export function classifyDockerAlertObservation(
  ruleKind: DockerAlertRuleKind,
  observation: DockerAlertObservation | null | undefined,
): DockerAlertSignal {
  switch (ruleKind) {
    case "container_unhealthy":
      return classifyContainerUnhealthyObservation(observation);
    case "container_restart_loop":
      return classifyRestartLoopObservation(observation);
    case "container_cpu_high":
      return classifyCpuHighObservation(observation);
    case "container_memory_high":
      return classifyMemoryHighObservation(observation);
    case "docker_storage_pressure":
      return classifyStoragePressureObservation(observation);
    case "docker_event_gap":
      return classifyEventGapObservation(observation);
  }
}

function persistActive(
  active: DockerAlertActive,
  observedAt: string,
): { nextAlert: DockerAlertActive; transition: "persisted" | "acknowledged_persisted" } {
  const nextAlert: DockerAlertActive = { ...active, lastObservedAt: observedAt, occurrences: active.occurrences + 1 };
  return { nextAlert, transition: active.state === "acknowledged" ? "acknowledged_persisted" : "persisted" };
}

function openActive(observedAt: string): DockerAlertActive {
  return { state: "open", openedAt: observedAt, lastObservedAt: observedAt, occurrences: 1 };
}

function slideWindow(prev: DockerTypedAlertState, signal: "positive" | "negative" | "neutral", size: number): Array<"positive" | "negative" | "neutral"> {
  return [...prev.window, signal].slice(-size);
}

function evaluateSimpleThreshold(
  prev: DockerTypedAlertState,
  observation: DockerAlertObservation,
  signal: "positive" | "negative" | "neutral",
  config: { open: number; window: number; clear: number; cooldown: number },
  severity: DockerAlertSeverity,
): DockerTypedAlertResult {
  const observedAt = observation.observedAt;
  if (typeof observedAt !== "string" || Number.isNaN(Date.parse(observedAt))) {
    throw new Error("observation.observedAt must be a valid ISO datetime string");
  }
  if (signal === "neutral" && prev.alert === null) {
    const next: DockerTypedAlertState = { ...prev, window: slideWindow(prev, signal, config.window), quietCount: 0 };
    return { next, transition: "no_change", resolution: null, ruleKind: prev.ruleKind, ruleVersion: 1, severity };
  }
  const window = slideWindow(prev, signal, config.window);
  const positives = window.filter((entry) => entry === "positive").length;
  const clearRun = window.length >= config.clear && window.slice(-config.clear).every((entry) => entry === "negative");
  if (prev.alert !== null && clearRun) {
    const next: DockerTypedAlertState = { ...prev, window, quietCount: 0, cooldownRemaining: config.cooldown, alert: null };
    return { next, transition: "resolved", resolution: "condition_cleared", ruleKind: prev.ruleKind, ruleVersion: 1, severity };
  }
  if (prev.alert !== null) {
    if (signal === "positive") {
      const { nextAlert, transition } = persistActive(prev.alert, observedAt);
      const next: DockerTypedAlertState = { ...prev, window, alert: nextAlert };
      return { next, transition, resolution: null, ruleKind: prev.ruleKind, ruleVersion: 1, severity };
    }
    const next: DockerTypedAlertState = { ...prev, window, alert: { ...prev.alert } };
    return { next, transition: "no_change", resolution: null, ruleKind: prev.ruleKind, ruleVersion: 1, severity };
  }
  if (prev.cooldownRemaining > 0) {
    const next: DockerTypedAlertState = { ...prev, window, cooldownRemaining: prev.cooldownRemaining - 1 };
    return { next, transition: "no_change", resolution: null, ruleKind: prev.ruleKind, ruleVersion: 1, severity };
  }
  if (positives >= config.open) {
    const next: DockerTypedAlertState = { ...prev, window, quietCount: 0, alert: openActive(observedAt) };
    return { next, transition: "opened", resolution: null, ruleKind: prev.ruleKind, ruleVersion: 1, severity };
  }
  const next: DockerTypedAlertState = { ...prev, window };
  return { next, transition: "no_change", resolution: null, ruleKind: prev.ruleKind, ruleVersion: 1, severity };
}

/**
 * Advance one rule by one observation. Pure and deterministic: inputs are never
 * mutated; unknown/gap/partial/aggregate/identity-mismatched observations freeze.
 */
export function evaluateDockerAlert(
  prev: DockerTypedAlertState,
  observation: DockerAlertObservation | null | undefined,
): DockerTypedAlertResult {
  if (prev === null || prev === undefined) throw new Error("prev state is required");
  const config = DOCKER_ALERT_RULES[prev.ruleKind];
  const severity = config.severity;
  const signal = classifyDockerAlertObservation(prev.ruleKind, observation);
  if (prev.ruleKind === "docker_event_gap") {
    if (signal === null) return frozenAlertResult(prev, severity);
    const observedAt = (observation as DockerAlertObservation).observedAt;
    if (typeof observedAt !== "string" || Number.isNaN(Date.parse(observedAt))) {
      throw new Error("observation.observedAt must be a valid ISO datetime string");
    }
    if (signal === "baseline") {
      if (prev.alert === null) {
        const next: DockerTypedAlertState = { ...prev, quietCount: 0 };
        return { next, transition: "no_change", resolution: null, ruleKind: prev.ruleKind, ruleVersion: 1, severity };
      }
      const next: DockerTypedAlertState = { ...prev, window: [], quietCount: 0, cooldownRemaining: config.cooldown, alert: null };
      return { next, transition: "resolved_baseline", resolution: "baseline_reset", ruleKind: prev.ruleKind, ruleVersion: 1, severity };
    }
    const slot: "positive" | "negative" = signal === "positive" ? "positive" : "negative";
    const window: Array<"positive" | "negative" | "neutral"> = [...prev.window, slot].slice(-config.window);
    const quietCount = slot === "negative" ? prev.quietCount + 1 : 0;
    if (prev.alert !== null && quietCount >= 3) {
      const next: DockerTypedAlertState = { ...prev, window, quietCount: 0, cooldownRemaining: config.cooldown, alert: null };
      return { next, transition: "resolved", resolution: "condition_cleared", ruleKind: prev.ruleKind, ruleVersion: 1, severity };
    }
    if (prev.alert !== null && slot === "positive") {
      const { nextAlert, transition } = persistActive(prev.alert, observedAt);
      const next: DockerTypedAlertState = { ...prev, window, quietCount, alert: nextAlert };
      return { next, transition, resolution: null, ruleKind: prev.ruleKind, ruleVersion: 1, severity };
    }
    if (prev.alert !== null) {
      const next: DockerTypedAlertState = { ...prev, window, quietCount, alert: { ...prev.alert } };
      return { next, transition: "no_change", resolution: null, ruleKind: prev.ruleKind, ruleVersion: 1, severity };
    }
    if (slot === "positive") {
      const next: DockerTypedAlertState = { ...prev, window, quietCount, alert: openActive(observedAt) };
      return { next, transition: "opened", resolution: null, ruleKind: prev.ruleKind, ruleVersion: 1, severity };
    }
    const next: DockerTypedAlertState = { ...prev, window, quietCount };
    return { next, transition: "no_change", resolution: null, ruleKind: prev.ruleKind, ruleVersion: 1, severity };
  }
  if (signal === null || !identityMatches(prev, observation as DockerAlertObservation)) {
    return frozenAlertResult(prev, severity);
  }
  const obs = observation as DockerAlertObservation;
  if (typeof obs.observedAt !== "string" || Number.isNaN(Date.parse(obs.observedAt))) {
    throw new Error("observation.observedAt must be a valid ISO datetime string");
  }
  if (signal === "removed") {
    if (prev.alert === null) {
      const next: DockerTypedAlertState = { ...prev, window: [...prev.window] };
      return { next, transition: "no_change", resolution: null, ruleKind: prev.ruleKind, ruleVersion: 1, severity };
    }
    const next: DockerTypedAlertState = { ...prev, window: [...prev.window], quietCount: 0, cooldownRemaining: 0, alert: null };
    return { next, transition: "resolved_container_removed", resolution: "container_removed", ruleKind: prev.ruleKind, ruleVersion: 1, severity };
  }
  if (signal === "baseline") return frozenAlertResult(prev, severity);
  if (prev.ruleKind === "container_restart_loop") {
    const slot: "positive" | "negative" = signal === "positive" ? "positive" : "negative";
    const window = slideWindow(prev, slot, config.window);
    const positives = window.filter((entry) => entry === "positive").length;
    const quietCount = slot === "positive" ? 0 : prev.quietCount + 1;
    const healthy = obs.healthySample === true || obs.health === "healthy" || obs.health === "running";
    if (prev.alert !== null && healthy && quietCount >= 3) {
      const next: DockerTypedAlertState = { ...prev, window, quietCount: 0, cooldownRemaining: config.cooldown, alert: null };
      return { next, transition: "resolved", resolution: "condition_cleared", ruleKind: prev.ruleKind, ruleVersion: 1, severity };
    }
    if (prev.alert !== null && slot === "positive") {
      const { nextAlert, transition } = persistActive(prev.alert, obs.observedAt);
      const next: DockerTypedAlertState = { ...prev, window, quietCount, alert: nextAlert };
      return { next, transition, resolution: null, ruleKind: prev.ruleKind, ruleVersion: 1, severity };
    }
    if (prev.alert !== null) {
      const next: DockerTypedAlertState = { ...prev, window, quietCount, alert: { ...prev.alert } };
      return { next, transition: "no_change", resolution: null, ruleKind: prev.ruleKind, ruleVersion: 1, severity };
    }
    if (prev.cooldownRemaining > 0) {
      const next: DockerTypedAlertState = { ...prev, window, quietCount, cooldownRemaining: prev.cooldownRemaining - 1 };
      return { next, transition: "no_change", resolution: null, ruleKind: prev.ruleKind, ruleVersion: 1, severity };
    }
    if (positives >= config.open) {
      const next: DockerTypedAlertState = { ...prev, window, quietCount, alert: openActive(obs.observedAt) };
      return { next, transition: "opened", resolution: null, ruleKind: prev.ruleKind, ruleVersion: 1, severity };
    }
    const next: DockerTypedAlertState = { ...prev, window, quietCount };
    return { next, transition: "no_change", resolution: null, ruleKind: prev.ruleKind, ruleVersion: 1, severity };
  }
  const simpleConfig = config as { open: number; window: number; clear: number; cooldown: number };
  return evaluateSimpleThreshold(prev, obs, signal, simpleConfig, severity);
}

export type DockerAlertEvaluatorFn = typeof evaluateDockerAlert;

