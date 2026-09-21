/** Framework-independent bounded Docker invalidation broadcast/coalescing helpers. */

export const DOCKER_INVALIDATION_MAX_VPS_IDS = 100;
export const DOCKER_INVALIDATION_MAX_ALERT_IDS = 256;
export const DOCKER_INVALIDATION_FRAME_MAX_BYTES = 32 * 1024;

export type DockerActivity =
  | { type: "docker.events.available"; vpsId: string; newestEventId?: string; countHint?: number; truncated?: boolean }
  | { type: "docker.alerts.updated"; vpsId: string; changedAlertIds: string[]; refreshRequired?: boolean };

export type DockerInvalidationPayload = {
  vpsIds: string[];
  events: Array<{ vpsId: string; newestEventId?: string; countHint?: number; truncated?: boolean }>;
  alerts: Array<{ vpsId: string; changedAlertIds: string[]; refreshRequired: boolean }>;
  refreshRequired: boolean;
};

export type DockerActivityListener = (activity: DockerActivity) => void;

/** Small in-process publisher; committed ingest and alert transitions publish activity. */
export class DockerActivityService {
  private readonly listeners = new Set<DockerActivityListener>();
  subscribe(listener: DockerActivityListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  publish(activity: DockerActivity): void {
    for (const listener of [...this.listeners]) {
      try { listener(activity); } catch { /* isolate subscribers */ }
    }
  }
}

export class DockerInvalidationCoalescer {
  private readonly vps = new Set<string>();
  private readonly eventMap = new Map<string, DockerInvalidationPayload["events"][number]>();
  private readonly alertMap = new Map<string, Set<string>>();
  private readonly alertRefresh = new Set<string>();
  private overflow = false;
  private closed = false;

  constructor(private readonly scope?: { vpsId: string }) {}

  add(activity: DockerActivity): void {
    if (this.closed || (this.scope && activity.vpsId !== this.scope.vpsId)) return;
    if (!this.vps.has(activity.vpsId) && this.vps.size >= DOCKER_INVALIDATION_MAX_VPS_IDS) {
      this.overflow = true;
      return;
    }
    this.vps.add(activity.vpsId);
    if (activity.type === "docker.events.available") {
      this.eventMap.set(activity.vpsId, { ...activity });
      return;
    }
    if (activity.refreshRequired) this.alertRefresh.add(activity.vpsId);
    let ids = this.alertMap.get(activity.vpsId);
    if (!ids) { ids = new Set(); this.alertMap.set(activity.vpsId, ids); }
    for (const id of activity.changedAlertIds) {
      if (!ids.has(id) && this.alertCount() >= DOCKER_INVALIDATION_MAX_ALERT_IDS) { this.overflow = true; break; }
      ids.add(id);
    }
  }

  private alertCount(): number { let n = 0; for (const ids of this.alertMap.values()) n += ids.size; return n; }

  flush(): DockerInvalidationPayload | null {
    if (this.closed) return null;
    if (!this.vps.size && !this.overflow) return null;
    const result: DockerInvalidationPayload = {
      vpsIds: [...this.vps].sort(),
      events: [...this.eventMap.values()].sort((a, b) => a.vpsId.localeCompare(b.vpsId)),
      alerts: [...this.alertMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([vpsId, ids]) => ({ vpsId, changedAlertIds: [...ids].sort(), refreshRequired: this.alertRefresh.has(vpsId) })),
      refreshRequired: this.overflow,
    };
    this.clear();
    return result;
  }

  /** Returns a complete SSE frame, never exceeding the byte cap. */
  flushFrame(): string | null {
    const payload = this.flush();
    if (!payload) return null;
    const frame = (p: DockerInvalidationPayload) => {
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      return `id: ${id}\nevent: docker.invalidation\ndata: ${JSON.stringify(p)}\n\n`;
    };
    if (Buffer.byteLength(frame(payload), "utf8") <= DOCKER_INVALIDATION_FRAME_MAX_BYTES) return frame(payload);
    return frame({ vpsIds: [], events: [], alerts: [], refreshRequired: true });
  }

  teardown(): void { this.closed = true; this.clear(); }
  private clear(): void { this.vps.clear(); this.eventMap.clear(); this.alertMap.clear(); this.alertRefresh.clear(); this.overflow = false; }
}
