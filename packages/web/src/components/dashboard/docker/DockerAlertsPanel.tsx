import { useState } from "react";
import type { DockerAlert } from "../../../lib/api";
import { acknowledgeVpsDockerAlert } from "../../../lib/api";
import { EmptyState } from "../shared/EmptyState";

/** Bounded Docker alerts panel (read-only state/summary/occurrences). */
export function DockerAlertsPanel({
  alerts,
  retained,
  loading,
  error,
  vpsId,
  onAcknowledged,
}: {
  alerts: DockerAlert[];
  retained: number;
  loading: boolean;
  error?: string | null;
  vpsId?: string;
  onAcknowledged?: (alert: DockerAlert) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  if (loading) {
    return (
      <section aria-label="Docker alerts" aria-busy="true" className="rounded-none border border-white/10 bg-black/10 p-4">
        <p className="text-xs text-white/50">Loading Docker alerts…</p>
      </section>
    );
  }
  if (error) {
    return (
      <section aria-label="Docker alerts" className="rounded-none border border-white/10 bg-black/10 p-4">
        <p className="text-xs text-white/70">Docker alerts are unavailable right now.</p>
        <p className="mt-1 text-[11px] text-white/40">{error}</p>
      </section>
    );
  }
  return (
    <section aria-label="Docker alerts" className="rounded-none border border-white/10 bg-black/10 p-4">
      <h3 className="text-xs font-medium text-white/75">Alerts</h3>
      <p className="mt-1 text-[11px] text-white/40">
        showing {alerts.length} retained details of authoritative total {retained}
      </p>
      {alerts.length === 0 ? (
        <div className="mt-2">
          <EmptyState>No Docker alerts retained. New alerts appear here as read-only state, summary, and occurrence counts.</EmptyState>
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {alerts.map((alert) => (
            <li key={alert.id} className="rounded-none border border-white/10 bg-black/20 px-3 py-2 text-[12px]">
              <p className="flex items-center justify-between gap-2">
                <span className="font-medium text-white/85">{alert.ruleKind}</span>
                <span className="flex items-center gap-2 text-white/50">{alert.state}{vpsId && alert.state === "open" ? <button type="button" disabled={busy === alert.id} className="text-sky-200 underline" onClick={async () => { setBusy(alert.id); try { const result = await acknowledgeVpsDockerAlert(vpsId, alert.id); onAcknowledged?.(result.data); } finally { setBusy(null); } }}>{busy === alert.id ? "Acknowledging…" : "Acknowledge"}</button> : null}</span>
              </p>
              <p className="mt-0.5 text-white/60">{alert.summary}</p>
              <p className="mt-0.5 text-white/40">
                {alert.occurrences} occurrence{alert.occurrences === 1 ? "" : "s"} · opened {new Date(alert.openedAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
