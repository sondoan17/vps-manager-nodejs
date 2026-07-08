import type { DashboardOverview } from "./api";

// ── Event envelope types ──────────────────────────────────────────────

export type MonitoringEnvelope<TType extends string, TPayload> = {
  schemaVersion: 1;
  type: TType;
  id: string;
  emittedAt: string;
  payload: TPayload;
};

export type MonitoringHelloPayload = {
  mode: "demo" | "local";
  intervalMs: number;
};

export type MonitoringSnapshotPayload = {
  overview: DashboardOverview;
  servers: DashboardOverview["servers"];
  jobs: DashboardOverview["jobs"];
  metrics: DashboardOverview["metrics"];
  auditEvents: DashboardOverview["auditEvents"];
};

export type MetricsUpdatedPayload = {
  metrics: DashboardOverview["metrics"];
  systemInfo?: DashboardOverview["systemInfo"];
  dockerMetrics?: DashboardOverview["dockerMetrics"];
};

export type MonitoringHeartbeatPayload = Record<string, never>;

export type MonitoringErrorPayload = {
  message: string;
};

// ── Union of all recognised event types ───────────────────────────────

export type MonitoringEvent =
  | MonitoringEnvelope<"monitoring.hello", MonitoringHelloPayload>
  | MonitoringEnvelope<"monitoring.snapshot", MonitoringSnapshotPayload>
  | MonitoringEnvelope<"metrics.updated", MetricsUpdatedPayload>
  | MonitoringEnvelope<"monitoring.heartbeat", MonitoringHeartbeatPayload>
  | MonitoringEnvelope<"monitoring.error", MonitoringErrorPayload>;

// ── Connection state ──────────────────────────────────────────────────

export type LiveConnectionState =
  | { status: "connecting" }
  | { status: "live"; latestEventAt: string }
  | { status: "reconnecting"; latestEventAt?: string }
  | { status: "stale"; latestEventAt?: string };

// ── Event source subscription ─────────────────────────────────────────

export type MonitoringCallbacks = {
  onHello?: (payload: MonitoringHelloPayload) => void;
  onSnapshot?: (payload: MonitoringSnapshotPayload) => void;
  onMetricsUpdated?: (payload: MetricsUpdatedPayload) => void;
  onHeartbeat?: (payload: MonitoringHeartbeatPayload) => void;
  onError?: (payload: MonitoringErrorPayload) => void;
  onConnectionChange?: (state: LiveConnectionState) => void;
};

/**
 * Subscribe to the SSE monitoring stream.
 * Returns a cleanup function that closes the EventSource.
 */
export function subscribeMonitoring(
  callbacks: MonitoringCallbacks,
): () => void {
  let es: EventSource | null = null;
  let reconnectAttempts = 0;
  const maxReconnectDelay = 16_000;

  function connect() {
    if (es) {
      es.close();
    }

    callbacks.onConnectionChange?.({ status: "connecting" });
    es = new EventSource("/api/monitoring/stream");

    es.addEventListener("monitoring.hello", (event: MessageEvent) => {
      try {
        const envelope = JSON.parse(event.data) as MonitoringEvent;
        if (envelope.schemaVersion !== 1) return;
        callbacks.onHello?.(envelope.payload as MonitoringHelloPayload);
        callbacks.onConnectionChange?.({
          status: "live",
          latestEventAt: envelope.emittedAt,
        });
        reconnectAttempts = 0;
      } catch {
        // Ignore malformed events
      }
    });

    es.addEventListener("monitoring.snapshot", (event: MessageEvent) => {
      try {
        const envelope = JSON.parse(event.data) as MonitoringEvent;
        if (envelope.schemaVersion !== 1) return;
        callbacks.onSnapshot?.(envelope.payload as MonitoringSnapshotPayload);
        callbacks.onConnectionChange?.({
          status: "live",
          latestEventAt: envelope.emittedAt,
        });
        reconnectAttempts = 0;
      } catch {
        // Ignore
      }
    });

    es.addEventListener("metrics.updated", (event: MessageEvent) => {
      try {
        const envelope = JSON.parse(event.data) as MonitoringEvent;
        if (envelope.schemaVersion !== 1) return;
        callbacks.onMetricsUpdated?.(envelope.payload as MetricsUpdatedPayload);
        callbacks.onConnectionChange?.({
          status: "live",
          latestEventAt: envelope.emittedAt,
        });
        reconnectAttempts = 0;
      } catch {
        // Ignore
      }
    });

    es.addEventListener("monitoring.heartbeat", (event: MessageEvent) => {
      try {
        const envelope = JSON.parse(event.data) as MonitoringEvent;
        if (envelope.schemaVersion !== 1) return;
        callbacks.onHeartbeat?.(envelope.payload as MonitoringHeartbeatPayload);
        callbacks.onConnectionChange?.({
          status: "live",
          latestEventAt: envelope.emittedAt,
        });
        reconnectAttempts = 0;
      } catch {
        // Ignore
      }
    });

    es.addEventListener("monitoring.error", (event: MessageEvent) => {
      try {
        const envelope = JSON.parse(event.data) as MonitoringEvent;
        if (envelope.schemaVersion !== 1) return;
        callbacks.onError?.(envelope.payload as MonitoringErrorPayload);
        callbacks.onConnectionChange?.({
          status: "stale",
          latestEventAt: envelope.emittedAt,
        });
      } catch {
        // Ignore
      }
    });

    es.onerror = () => {
      // EventSource auto-reconnects; signal reconnecting state
      reconnectAttempts++;
      if (reconnectAttempts <= 1) {
        callbacks.onConnectionChange?.({ status: "reconnecting" });
      } else {
        callbacks.onConnectionChange?.({
          status: "stale",
        });
      }
    };
  }

  connect();

  return () => {
    if (es) {
      es.close();
      es = null;
    }
  };
}
