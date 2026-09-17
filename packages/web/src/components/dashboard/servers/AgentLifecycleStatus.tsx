import { AlertCircle, CheckCircle2, LoaderCircle, Radio } from "lucide-react";
import type { DashboardJob, VpsRecord } from "../../../lib/api";

const stepLabels: Record<string, string> = {
  queued: "Waiting to start",
  connecting: "Connecting to server",
  "creating-directory": "Preparing agent files",
  "uploading-binary": "Uploading agent",
  "writing-config": "Saving secure configuration",
  "installing-service": "Installing system service",
  "starting-service": "Starting agent",
  verifying: "Checking connection",
  stopping: "Stopping agent",
  "removing-service": "Removing system service",
  "removing-files": "Removing agent files",
};

export function agentJobFor(vps: VpsRecord, jobs: DashboardJob[]) {
  const lifecycleJobs = jobs.filter(
    (job) =>
      job.vpsId === vps.id &&
      (job.type === "install-agent" || job.type === "uninstall-agent" || job.type === "upgrade-agent" || job.type === "restart-agent"),
  );
  if (vps.lastAgentInstallJobId) {
    const exact = lifecycleJobs.find((job) => job.id === vps.lastAgentInstallJobId);
    if (exact) return exact;
  }
  // SSE payload ordering is not a lifecycle ordering. Prefer the newest known
  // job, with stable id ordering when timestamps are unavailable/equal.
  return lifecycleJobs.sort((a, b) => {
    const aTime = Date.parse(a.finishedAt || a.startedAt || "") || 0;
    const bTime = Date.parse(b.finishedAt || b.startedAt || "") || 0;
    return bTime - aTime || b.id.localeCompare(a.id);
  })[0];
}

export function AgentLifecycleStatus({ vps, jobs, compact = false }: {
  vps: VpsRecord;
  jobs: DashboardJob[];
  compact?: boolean;
}) {
  const job = agentJobFor(vps, jobs);
  const active = job && (job.status === "queued" || job.status === "running");
  const progress = active ? Math.min(100, Math.max(0, job.progress || 0)) : 0;
  const status = vps.agentStatus || "not_installed";

  if (active) {
    const removing = job.type === "uninstall-agent";
    const upgrading = job.type === "upgrade-agent";
    const restarting = job.type === "restart-agent";
    const label = restarting ? "Restarting agent" : upgrading ? "Upgrading agent" : stepLabels[job.step || ""] || (removing ? "Removing agent" : "Installing agent");
    return (
      <div className={compact ? "min-w-[150px]" : "mt-3 border-t border-white/10 pt-3"} aria-live="polite">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 text-white/75">
            <LoaderCircle size={13} className="animate-spin text-sky-300" aria-hidden="true" />
            {label}
          </span>
          <span className="tabular-nums text-white/45">{progress}%</span>
        </div>
        <div role="progressbar" aria-label={`${removing ? "Agent removal" : restarting ? "Agent restart" : upgrading ? "Agent upgrade" : "Agent install"}: ${label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="mt-2 h-1.5 overflow-hidden bg-white/10">
          <div className="h-full bg-sky-400 transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>
    );
  }

  if (status === "online") return <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300" role="status"><CheckCircle2 size={13} aria-hidden="true" />Agent online</span>;
  if (status === "offline") return <span className="inline-flex items-center gap-1.5 text-xs text-amber-300" role="status"><Radio size={13} aria-hidden="true" />Agent offline</span>;
  if (status === "failed") return <span className="inline-flex items-center gap-1.5 text-xs text-red-300" role="alert" title={job?.errorMessage || vps.agentLastError}><AlertCircle size={13} aria-hidden="true" />{job?.errorMessage || vps.agentLastError || "Agent action failed"}</span>;
  return <span className="text-xs text-white/45">Agent not installed</span>;
}
