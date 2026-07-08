import { type ReactNode } from "react";
import { Button } from "../../ui/button";
import type { DashboardOverview, VpsRecord } from "../../../lib/api";
import { formatBytes, formatDockerError } from "./helpers";

export function DockerMetricsPanel({
  vps,
  dockerMetrics,
  busy,
  onToggle,
}: {
  vps: VpsRecord;
  dockerMetrics?: DashboardOverview["dockerMetrics"][number];
  busy: boolean;
  onToggle: (vps: VpsRecord) => void;
}) {
  const enabled = vps.dockerMetricsEnabled === true;
  const topContainers = (dockerMetrics?.containers ?? [])
    .slice()
    .sort((a, b) => b.cpuPercent - a.cpuPercent)
    .slice(0, 3);

  let body: ReactNode;
  if (!enabled) {
    body = (
      <p className="text-xs font-normal text-white/50">Docker metrics off.</p>
    );
  } else if (!dockerMetrics) {
    body = (
      <p className="text-xs font-normal text-white/70">
        Waiting for Docker-capable agent.
      </p>
    );
  } else if (!dockerMetrics.available) {
    body = (
      <div className="space-y-1">
        <p className="text-xs font-normal text-white/70">
          {formatDockerError(dockerMetrics.errorCode)}
        </p>
        <p className="text-[11px] font-normal text-white/50">
          Check Docker socket access for the agent.
        </p>
      </div>
    );
  } else {
    body = (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5 text-[11px] font-normal text-white/70">
          <span className="rounded-none bg-white/[0.03] px-2 py-0.5 shadow-none">
            {dockerMetrics.containerRunning}/{dockerMetrics.containerTotal}{" "}
            running
          </span>
          <span className="rounded-none bg-white/[0.03] px-2 py-0.5 shadow-none">
            CPU {dockerMetrics.cpuPercent.toFixed(1)}%
          </span>
          <span className="rounded-none bg-white/[0.03] px-2 py-0.5 shadow-none">
            RAM {formatBytes(dockerMetrics.memoryUsageBytes)}
          </span>
          <span className="rounded-none bg-white/[0.03] px-2 py-0.5 shadow-none">
            Net{" "}
            {formatBytes(
              dockerMetrics.networkRxBytes + dockerMetrics.networkTxBytes,
            )}
          </span>
          <span className="rounded-none bg-white/[0.03] px-2 py-0.5 shadow-none">
            IO{" "}
            {formatBytes(
              dockerMetrics.blockReadBytes + dockerMetrics.blockWriteBytes,
            )}
          </span>
        </div>
        {topContainers.length ? (
          <div className="grid gap-1">
            {topContainers.map((container) => (
              <p
                key={container.id}
                className="truncate text-[11px] font-normal text-white/50"
                title={`${container.name} · ${container.image} · ${container.status}`}
              >
                <span className="text-[#ffffff]">{container.name}</span> ·{" "}
                {container.state} · {container.cpuPercent.toFixed(1)}% ·{" "}
                {formatBytes(container.memoryUsageBytes)}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-none border-0 bg-white/[0.03] shadow-none/90 px-3 py-2 shadow-none">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] font-normal uppercase tracking-[0.12em] text-white/50">
          Docker
        </span>
        <Button
          type="button"
          size="sm"
          variant={enabled ? "secondary" : "outline"}
          className="h-7 rounded-none px-2 text-[11px]"
          disabled={busy}
          aria-pressed={enabled}
          aria-label={`${enabled ? "Disable" : "Enable"} Docker metrics for ${vps.name}`}
          onClick={() => onToggle(vps)}
        >
          {enabled ? "On" : "Off"}
        </Button>
      </div>
      {body}
    </div>
  );
}
