import type { DockerOperationalEvent } from "../../../lib/api";
import { EmptyState } from "../shared/EmptyState";

function describeAction(action: string): string {
  const labels: Record<string, string> = {
    create: "Container created",
    start: "Container started",
    restart: "Container restarted",
    die: "Container exited",
    stop: "Container stopped",
    kill: "Container killed",
    destroy: "Container destroyed",
    remove: "Container removed",
    health_status: "Health status change",
    stream_gap: "Event stream gap",
    daemon_restarted: "Daemon restarted",
  };
  return labels[action] ?? action;
}

/** Bounded operational Docker events timeline (read-only, not audit). */
export function DockerEventTimeline({
  events,
  retained,
  loading,
  error,
}: {
  events: DockerOperationalEvent[];
  retained: number;
  loading: boolean;
  error?: string | null;
}) {
  if (loading) {
    return (
      <section aria-label="Docker events" aria-busy="true" className="rounded-none border border-white/10 bg-black/10 p-4">
        <p className="text-xs text-white/50">Loading operational Docker events…</p>
      </section>
    );
  }
  if (error) {
    return (
      <section aria-label="Docker events" className="rounded-none border border-white/10 bg-black/10 p-4">
        <p className="text-xs text-white/70">Operational Docker events are unavailable right now.</p>
        <p className="mt-1 text-[11px] text-white/40">{error}</p>
      </section>
    );
  }
  return (
    <section aria-label="Docker events" className="rounded-none border border-white/10 bg-black/10 p-4">
      <h3 className="text-xs font-medium text-white/75">Operational Docker events</h3>
      <p className="mt-1 text-[11px] text-white/40">
        Operational Docker events (container lifecycle), not the audit log. showing {events.length} loaded events
      </p>
      {events.length === 0 ? (
        <div className="mt-2">
          <EmptyState>No operational Docker events retained yet.</EmptyState>
        </div>
      ) : (
        <ol className="mt-3 space-y-2">
          {events.map((event) => (
            <li key={event.id} className="flex items-start gap-3 text-[12px]">
              <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-white/30" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-white/80">{describeAction(event.action)}</p>
                <p className="truncate text-white/40">
                  {new Date(event.eventOccurredAt).toLocaleString()}
                  {event.containerKey ? ` · ${event.containerKey}` : ""}
                  {event.exitCode !== undefined ? ` · exit ${event.exitCode}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
