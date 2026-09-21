import type { DockerHostSample, DockerMetricRollup } from "../../../lib/api";
import { EmptyState } from "../shared/EmptyState";

function metricAt(sample: DockerHostSample, key: string): number | undefined {
  const value = sample.metrics[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function pointsFor(samples: DockerHostSample[], key: string) {
  return [...samples]
    .sort((a, b) => +new Date(a.effectiveAt) - +new Date(b.effectiveAt))
    .map((s) => ({ at: s.effectiveAt, value: metricAt(s, key) }))
    .filter((p): p is { at: string; value: number } => p.value !== undefined);
}

/** Bounded host history sparkline (read-only SVG, no controls). */
export function DockerHistoryChart({
  samples,
  rollups,
  retained,
  loading,
  error,
}: {
  samples: DockerHostSample[];
  rollups?: DockerMetricRollup[];
  retained: number;
  loading: boolean;
  error?: string | null;
}) {
  if (loading) {
    return (
      <section aria-label="Docker history" aria-busy="true" className="rounded-none border border-white/10 bg-black/10 p-4">
        <p className="text-xs text-white/50">Loading bounded Docker history…</p>
      </section>
    );
  }
  if (error) {
    return (
      <section aria-label="Docker history" className="rounded-none border border-white/10 bg-black/10 p-4">
        <p className="text-xs text-white/70">Docker history is unavailable right now.</p>
        <p className="mt-1 text-[11px] text-white/40">{error}</p>
      </section>
    );
  }
  const cpu = pointsFor(samples, "cpuPercent");
  const mem = pointsFor(samples, "memoryUsageBytes");
  const ordered = [...samples].sort((a, b) => +new Date(a.effectiveAt) - +new Date(b.effectiveAt));
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const partial = samples.filter((sample) => sample.coverage && !sample.coverage.complete).length;
  const gaps = samples.filter((sample) => sample.coverage && sample.coverage.detailsSampled < sample.coverage.detailsTotalEligible).length;
  if (cpu.length === 0 && mem.length === 0) {
    return (
      <section aria-label="Docker history" className="rounded-none border border-white/10 bg-black/10 p-4">
        <h3 className="text-xs font-medium text-white/75">History</h3>
        <div className="mt-2">
          <EmptyState>
            No Docker history retained yet. Snapshots appear here once the agent reports host samples.
          </EmptyState>
        </div>
      </section>
    );
  }

  const spark = (points: { at: string; value: number }[], label: string) => {
    if (points.length === 0) return <p className="text-[11px] text-white/40">No {label} points retained.</p>;
    const max = Math.max(...points.map((p) => p.value), 1);
    const w = 220;
    const h = 44;
    const step = points.length > 1 ? w / (points.length - 1) : 0;
    const d = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - 4 - (p.value / max) * (h - 10)).toFixed(1)}`)
      .join(" ");
    return (
      <figure>
        <figcaption className="text-[11px] text-white/50">{label}</figcaption>
        <svg viewBox={`0 0 ${w} ${h}`} className="mt-1 h-11 w-full" role="img" aria-label={`${label} history sparkline`}>
          <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-sky-300" />
        </svg>
      </figure>
    );
  };

  return (
    <section aria-label="Docker history" className="rounded-none border border-white/10 bg-black/10 p-4">
      <h3 className="text-xs font-medium text-white/75">History</h3>
      <p className="mt-1 text-[11px] text-white/40">Raw host samples; {rollups?.length ?? 0} hourly rollups available for longer-range context.</p>
      <p className="mt-1 text-[11px] text-white/40">
        showing {samples.length} retained raw host samples{retained > samples.length ? ` of ${retained} available` : ""}
      </p>
      <p className="mt-1 text-[11px] text-white/40">
        {first && last ? `${new Date(first.effectiveAt).toLocaleString()} – ${new Date(last.effectiveAt).toLocaleString()}` : "No source range"}
        {partial ? ` · ${partial} partial coverage` : ""}
        {gaps ? ` · ${gaps} samples with reduced detail coverage` : ""}
      </p>
      <div className="mt-3 grid gap-4 text-white/80 sm:grid-cols-2">
        {spark(cpu, "CPU %")}
        {spark(mem, "Memory bytes")}
      </div>
    </section>
  );
}
