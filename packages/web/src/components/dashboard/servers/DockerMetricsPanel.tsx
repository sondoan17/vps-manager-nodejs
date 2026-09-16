import { useState, type ReactNode } from "react";
import { Button } from "../../ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../ui/alert-dialog";
import type { DashboardDockerContainerMetric, DashboardOverview, VpsRecord } from "../../../lib/api";
import { vpsDisplayName } from "../../../lib/dashboard-formatters";
import { formatBytes, formatDockerError } from "./helpers";

function isUnhealthy(container: DashboardDockerContainerMetric) {
  return /unhealthy|health:\s*starting|restarting|dead|exited/i.test(
    `${container.state} ${container.status ?? ""}`,
  );
}

function isRunning(container: DashboardDockerContainerMetric) {
  return container.state.toLowerCase() === "running" && !isUnhealthy(container);
}

function displayNames(containers: DashboardDockerContainerMetric[]) {
  const prefixCounts = new Map<string, number>();
  for (const { name } of containers) {
    const match = name.match(/^([a-zA-Z0-9.-]+)_([^_]+)_\d+$/);
    if (match) prefixCounts.set(match[1], (prefixCounts.get(match[1]) ?? 0) + 1);
  }
  return new Map(containers.map((container) => {
    const match = container.name.match(/^([a-zA-Z0-9.-]+)_([^_]+)_\d+$/);
    const shortened = match && (prefixCounts.get(match[1]) ?? 0) > 1 ? match[2] : container.name;
    return [container.id, shortened];
  }));
}

function ContainerRow({ container, name }: { container: DashboardDockerContainerMetric; name: string }) {
  const healthy = isRunning(container);
  const status = healthy ? "Running" : isUnhealthy(container) ? "Problem" : "Stopped";
  return (
    <li
      className={`grid min-w-0 grid-cols-[minmax(0,1fr)_4.25rem_4.75rem] items-center gap-2 border-t px-2 py-1.5 text-[11px] ${healthy ? "border-white/[0.06] text-white/55" : "border-amber-400/20 bg-amber-400/[0.07] text-white/75"}`}
      title={`${container.name} · ${container.image} · ${container.status ?? container.state}`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${healthy ? "bg-emerald-400" : "bg-amber-400"}`} aria-hidden="true" />
        <span className="min-w-0 truncate font-medium text-white">{name}</span>
        <span className="sr-only">{status}</span>
      </span>
      <span className="text-right tabular-nums" aria-label={`CPU ${container.cpuPercent.toFixed(1)} percent`}>
        {container.cpuPercent.toFixed(1)}% <span className="sr-only">CPU</span>
      </span>
      <span className="truncate text-right tabular-nums" aria-label={`Memory ${formatBytes(container.memoryUsageBytes)}`}>
        {formatBytes(container.memoryUsageBytes)}
      </span>
    </li>
  );
}

export function DockerMetricsPanel({ vps, dockerMetrics, busy, onToggle }: {
  vps: VpsRecord;
  dockerMetrics?: DashboardOverview["dockerMetrics"][number];
  busy: boolean;
  onToggle: (vps: VpsRecord) => void;
}) {
  const enabled = vps.dockerMetricsEnabled === true;
  const [expanded, setExpanded] = useState(false);
  const [enableDialogOpen, setEnableDialogOpen] = useState(false);
  const containers = dockerMetrics?.containers ?? [];
  const problems = containers.filter((container) => !isRunning(container));
  const running = containers.filter(isRunning).sort((a, b) => b.cpuPercent - a.cpuPercent);
  const unhealthyCount = problems.filter(isUnhealthy).length;
  const stoppedCount = Math.max(0, (dockerMetrics?.containerTotal ?? containers.length) - (dockerMetrics?.containerRunning ?? running.length));
  const names = displayNames(containers);
  const visibleRunning = expanded ? running : running.slice(0, 3);

  let body: ReactNode;
  if (!enabled) body = <p className="text-xs text-white/50">Docker monitoring is off.</p>;
  else if (!dockerMetrics) body = <p className="text-xs text-white/70">Waiting for Docker-capable agent.</p>;
  else if (!dockerMetrics.available) body = (
    <div className="space-y-1" role="status">
      <p className="text-xs text-white/70">{formatDockerError(dockerMetrics.errorCode)}</p>
      <p className="text-[11px] text-white/50">Check Docker socket access for the agent.</p>
    </div>
  );
  else body = (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" aria-label="Container health summary">
        <span className="font-medium text-emerald-300">{dockerMetrics.containerRunning} running</span>
        {stoppedCount > 0 ? <span className="font-medium text-amber-300">{stoppedCount} stopped</span> : null}
        {unhealthyCount > 0 ? <span className="font-medium text-rose-300">{unhealthyCount} unhealthy</span> : null}
      </div>
      {problems.length ? (
        <section aria-label="Containers needing attention">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-amber-300">Needs attention</p>
          <ul>{problems.map((container) => <ContainerRow key={container.id} container={container} name={names.get(container.id) ?? container.name} />)}</ul>
        </section>
      ) : null}
      {running.length ? (
        <section aria-label="Running containers">
          <div className="mb-1 grid grid-cols-[minmax(0,1fr)_4.25rem_4.75rem] gap-2 px-2 text-[9px] uppercase tracking-[0.1em] text-white/35">
            <span>{problems.length ? "Running" : "Containers"}</span><span className="text-right">CPU</span><span className="text-right">Memory</span>
          </div>
          <ul>{visibleRunning.map((container) => <ContainerRow key={container.id} container={container} name={names.get(container.id) ?? container.name} />)}</ul>
        </section>
      ) : containers.length === 0 ? <p className="text-xs text-white/50">No containers reported.</p> : null}
      {running.length > 3 ? (
        <button type="button" className="text-[11px] font-medium text-white/70 underline-offset-4 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
          {expanded ? "Show less ↑" : `View all ${containers.length} →`}
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="rounded-none border-0 bg-white/[0.03] px-3 py-2 shadow-none">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/60">Docker</span>
        <Button type="button" size="sm" variant={enabled ? "secondary" : "outline"} className="h-7 rounded-none px-2 text-[11px]" disabled={busy} aria-pressed={enabled} aria-label={`${enabled ? "Disable" : "Enable"} Docker metrics for ${vpsDisplayName(vps)}`} onClick={() => enabled ? onToggle(vps) : setEnableDialogOpen(true)}>
          {enabled ? "On" : "Off"}
        </Button>
      </div>
      {body}
      <AlertDialog open={enableDialogOpen} onOpenChange={setEnableDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enable Docker monitoring?</AlertDialogTitle>
            <AlertDialogDescription>
              The agent will collect container names, images, status, and resource usage. Docker must be available to the agent. Environment variables, logs, mounts, labels, and commands are not collected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={() => { onToggle(vps); setEnableDialogOpen(false); }}>
              Enable Docker monitoring
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
