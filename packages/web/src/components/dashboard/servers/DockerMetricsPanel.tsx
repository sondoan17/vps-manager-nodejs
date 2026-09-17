import { useMemo, useState, type ReactNode } from "react";
import { Button } from "../../ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../ui/alert-dialog";
import type { DashboardDockerContainerMetric, DashboardOverview, VpsRecord } from "../../../lib/api";
import { freshnessLabel, vpsDisplayName } from "../../../lib/dashboard-formatters";
import { formatBytes, formatDockerError } from "./helpers";

type Filter = "all" | "running" | "stopped" | "unhealthy";
type Sort = "name" | "cpu" | "memory" | "state";
type SnapshotState = "live" | "stale" | "unknown";

export function dockerSnapshotState(metric?: DashboardOverview["dockerMetrics"][number], now = Date.now()): SnapshotState {
  if (metric?.freshness === "fresh") return "live";
  if (metric?.freshness === "stale") return "stale";
  if (!metric?.receivedAt) return "unknown";
  const receivedAt = Date.parse(metric.receivedAt);
  if (!Number.isFinite(receivedAt) || receivedAt > now) return "unknown";
  return now - receivedAt < 120_000 ? "live" : "stale";
}

function isUnhealthy(container: DashboardDockerContainerMetric) {
  return /unhealthy|health:\s*starting|restarting|dead/i.test(`${container.state} ${container.status ?? ""}`);
}
function isRunning(container: DashboardDockerContainerMetric) { return container.state.toLowerCase() === "running" && !isUnhealthy(container); }
function isStopped(container: DashboardDockerContainerMetric) { return !isRunning(container) && !isUnhealthy(container); }

function displayNames(containers: DashboardDockerContainerMetric[]) {
  const counts = new Map<string, number>();
  containers.forEach(({ name }) => { const match = name.match(/^([a-zA-Z0-9.-]+)_([^_]+)_\d+$/); if (match) counts.set(match[1], (counts.get(match[1]) ?? 0) + 1); });
  return new Map(containers.map((container) => { const match = container.name.match(/^([a-zA-Z0-9.-]+)_([^_]+)_\d+$/); return [container.id, match && (counts.get(match[1]) ?? 0) > 1 ? match[2] : container.name]; }));
}

function ContainerRow({ container, name, stale }: { container: DashboardDockerContainerMetric; name: string; stale: boolean }) {
  const running = isRunning(container);
  const status = running ? "Running" : isUnhealthy(container) ? "Unhealthy" : "Stopped";
  return <li className={`grid min-w-0 grid-cols-[minmax(0,1fr)_3.75rem_4.5rem] items-center gap-2 border-t px-2 py-2 text-[11px] ${running ? "border-white/[0.06] text-white/55" : "border-amber-400/20 bg-amber-400/[0.07] text-white/75"}`} title={`${container.name} · ${container.image} · ${container.status ?? container.state}`}>
    <span className="flex min-w-0 items-center gap-2"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${running ? "bg-emerald-400" : isUnhealthy(container) ? "bg-rose-400" : "bg-amber-400"}`} aria-hidden="true" /><span className="min-w-0"><span className="block truncate font-medium text-white">{name}</span><span className="block truncate text-[9px] text-white/35">{container.image} · {status}</span></span></span>
    <span className="text-right tabular-nums" aria-label={`CPU ${container.cpuPercent.toFixed(1)} percent${stale ? ", stale" : ""}`}>{container.cpuPercent.toFixed(1)}%</span>
    <span className="truncate text-right tabular-nums" aria-label={`Memory ${formatBytes(container.memoryUsageBytes)}${stale ? ", stale" : ""}`}>{formatBytes(container.memoryUsageBytes)}</span>
  </li>;
}

export function DockerMetricsPanel({ vps, dockerMetrics, busy, onToggle }: { vps: VpsRecord; dockerMetrics?: DashboardOverview["dockerMetrics"][number]; busy: boolean; onToggle: (vps: VpsRecord) => void }) {
  const enabled = vps.dockerMetricsEnabled === true;
  const [expanded, setExpanded] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("state");
  const containers = dockerMetrics?.containers ?? [];
  const snapshotState = dockerSnapshotState(dockerMetrics);
  const notLive = snapshotState !== "live";
  const names = displayNames(containers);
  const filtered = useMemo(() => containers.filter((container) => {
    const matchesQuery = `${container.name} ${container.image}`.toLowerCase().includes(query.trim().toLowerCase());
    return matchesQuery && (filter === "all" || (filter === "running" && isRunning(container)) || (filter === "stopped" && isStopped(container)) || (filter === "unhealthy" && isUnhealthy(container)));
  }).sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "cpu" ? b.cpuPercent - a.cpuPercent : sort === "memory" ? b.memoryUsageBytes - a.memoryUsageBytes : Number(isRunning(a)) - Number(isRunning(b)) || a.state.localeCompare(b.state)), [containers, query, filter, sort]);
  const detailLimit = expanded ? 20 : 3;
  const visible = filtered.slice(0, detailLimit);
  const runningCount = containers.filter(isRunning).length;
  const unhealthyCount = containers.filter(isUnhealthy).length;
  const stoppedCount = containers.filter(isStopped).length;
  const updatedAt = dockerMetrics?.lastUpdatedAt ?? dockerMetrics?.receivedAt ?? dockerMetrics?.collectedAt;
  const total = Math.max(dockerMetrics?.containerTotal ?? containers.length, containers.length);
  const retainedDetails = total > containers.length;

  let body: ReactNode;
  if (!enabled) body = <div className="rounded-sm border border-white/[0.06] bg-black/10 p-3"><p className="text-xs font-medium text-white/70">Docker monitoring is off.</p><p className="mt-1 text-[11px] text-white/45">Enable it to see container health and resource usage.</p></div>;
  else if (!dockerMetrics) body = <div className="space-y-1" role="status"><div className="flex items-center gap-2 text-xs text-white/70"><span className="h-2 w-2 animate-pulse rounded-full bg-sky-300" />Waiting for Docker-capable agent.</div><p className="pl-4 text-[10px] text-white/40">The first snapshot will appear here automatically.</p></div>;
  else if (!dockerMetrics.available) body = <div className="rounded-sm border border-rose-300/15 bg-rose-400/[0.06] p-3" role="status"><p className="text-xs font-medium text-rose-200">Docker unavailable</p><p className="mt-1 text-[11px] leading-relaxed text-white/60">{formatDockerError(dockerMetrics.errorCode)}</p>{updatedAt ? <p className="mt-2 text-[10px] text-white/35">Last checked {freshnessLabel(updatedAt)}</p> : null}</div>;
  else body = <div className="space-y-2.5">
    <div className={`flex flex-wrap items-center justify-between gap-2 rounded-sm border px-2.5 py-2 ${notLive ? "border-amber-300/20 bg-amber-300/[0.07]" : "border-emerald-300/15 bg-emerald-300/[0.05]"}`} role="status">
      <div><p className={`text-[11px] font-semibold ${notLive ? "text-amber-200" : "text-emerald-200"}`}>{snapshotState === "live" ? "Live snapshot" : snapshotState === "stale" ? "Saved snapshot · not live" : "Saved snapshot · freshness unknown · not live"}</p><p className="text-[10px] text-white/45">{updatedAt ? `Updated ${freshnessLabel(updatedAt)}` : "Update time unavailable"}{dockerMetrics.ageSeconds != null ? ` · ${dockerMetrics.ageSeconds}s old` : ""}</p></div>
      {(dockerMetrics.engineVersion || dockerMetrics.apiVersion) ? <span className="text-[10px] text-white/40">Engine {dockerMetrics.engineVersion ?? "—"}{dockerMetrics.apiVersion ? ` · API ${dockerMetrics.apiVersion}` : ""}</span> : null}
    </div>
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]" aria-label="Container health summary"><span className="font-medium text-emerald-300">{runningCount} running</span><span className="font-medium text-white/50">{stoppedCount} stopped</span>{unhealthyCount > 0 ? <span className="font-medium text-rose-300">{unhealthyCount} unhealthy</span> : null}</div>
    {containers.length ? <><div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
      <label className="sr-only" htmlFor={`docker-search-${vps.id}`}>Search containers by name or image</label><input id={`docker-search-${vps.id}`} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or image…" className="h-8 min-w-0 rounded-sm border border-white/10 bg-black/20 px-2.5 text-[11px] text-white placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60" />
      <label className="sr-only" htmlFor={`docker-filter-${vps.id}`}>Filter containers</label><select id={`docker-filter-${vps.id}`} value={filter} onChange={(event) => setFilter(event.target.value as Filter)} className="h-8 rounded-sm border border-white/10 bg-slate-900 px-2 text-[11px] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60"><option value="all">All</option><option value="running">Running</option><option value="stopped">Stopped</option><option value="unhealthy">Unhealthy</option></select>
      <label className="sr-only" htmlFor={`docker-sort-${vps.id}`}>Sort containers</label><select id={`docker-sort-${vps.id}`} value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="h-8 rounded-sm border border-white/10 bg-slate-900 px-2 text-[11px] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60"><option value="state">Sort: state</option><option value="name">Sort: name</option><option value="cpu">Sort: CPU</option><option value="memory">Sort: memory</option></select>
    </div><div className="space-y-0.5 text-[10px] text-white/40"><div className="flex items-center justify-between gap-2"><span aria-live="polite">Showing {visible.length} detail rows of {total} reported containers</span>{filtered.length !== containers.length ? <span>{filtered.length} matches in details</span> : null}</div>{retainedDetails ? <p>Search and filters cover {containers.length} retained detail rows; {total - containers.length} reported containers have no detail row.</p> : null}</div>
    {visible.length ? <><div className="grid grid-cols-[minmax(0,1fr)_3.75rem_4.5rem] gap-2 px-2 text-[9px] uppercase tracking-[0.1em] text-white/35"><span>Container</span><span className="text-right">CPU</span><span className="text-right">Memory</span></div><ul>{visible.map((container) => <ContainerRow key={container.id} container={container} name={names.get(container.id) ?? container.name} stale={notLive} />)}</ul></> : <p className="py-3 text-center text-xs text-white/50">No containers match this view.</p>}
    {filtered.length > 3 ? <button type="button" className="text-[11px] font-medium text-sky-200 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>{expanded ? "Show less ↑" : `Show details (max 20) →`}</button> : null}</> : <p className="text-xs text-white/50">No containers reported.</p>}
  </div>;

  return <div className="rounded-none border-0 bg-white/[0.03] px-3 py-2 shadow-none"><div className="mb-2 flex items-center justify-between gap-2"><span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/60">Docker</span><Button type="button" size="sm" variant={enabled ? "secondary" : "outline"} className="h-7 rounded-none px-2 text-[11px]" disabled={busy} aria-pressed={enabled} aria-label={`${enabled ? "Disable" : "Enable"} Docker metrics for ${vpsDisplayName(vps)}`} onClick={() => enabled ? onToggle(vps) : setDialogOpen(true)}>{enabled ? "On" : "Off"}</Button></div>{body}
    <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Enable Docker monitoring?</AlertDialogTitle><AlertDialogDescription>The agent will collect container names, images, status, and resource usage. Docker must be available to the agent. Environment variables, logs, mounts, labels, and commands are not collected.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={() => { onToggle(vps); setDialogOpen(false); }}>Enable Docker monitoring</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
