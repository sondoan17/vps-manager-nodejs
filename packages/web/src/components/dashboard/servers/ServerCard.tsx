import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Clock3,
  DownloadCloud,
  Edit3,
  KeyRound,
  MapPin,
  MoreHorizontal,
  RotateCw,
  Server,
  ServerCog,
  ShieldCheck,
  TerminalSquare,
  Trash2,
} from "lucide-react";
import { Badge } from "../../ui/badge";
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
  AlertDialogTrigger,
} from "../../ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
  chipVariant,
  formatDate,
  freshnessLabel,
  serverStatusLabel,
  vpsDisplayName,
} from "../../../lib/dashboard-formatters";
import type { DashboardOverview, VpsRecord } from "../../../lib/api";
import { formatUptime } from "../shared/formatUptime";
import { formatBytes } from "./helpers";
import { DockerMetricsPanel } from "./DockerMetricsPanel";

// ── ServerCard ───────────────────────────────────────────────────────

export function ServerCard({
  vps,
  metric,
  systemInfo,
  dockerMetrics,
  jobs,
  busy,
  password,
  onPasswordChange,
  onProvision,
  onVerify,
  onInstallAgent,
  onToggleDockerMetrics,
  onDelete,
}: {
  vps: VpsRecord;
  metric?: DashboardOverview["metrics"][number];
  systemInfo?: DashboardOverview["systemInfo"][number];
  dockerMetrics?: DashboardOverview["dockerMetrics"][number];
  jobs: DashboardOverview["jobs"];
  busy: boolean;
  password: string;
  onPasswordChange: (id: string, value: string) => void;
  onProvision: (vps: VpsRecord) => void;
  onVerify: (vps: VpsRecord) => void;
  onInstallAgent: (vps: VpsRecord) => void;
  onToggleDockerMetrics: (vps: VpsRecord) => void;
  onDelete: (vps: VpsRecord) => void;
}) {
  const isLocalHost = vps.kind === "local" || vps.managedBy === "system";
  const isReady = isLocalHost || Boolean(vps.keyProvisionedAt);
  const isDown = vps.status === "unreachable";
  const [showPassword, setShowPassword] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<VpsRecord | null>(null);
  const displayName = vpsDisplayName(vps);

  const handlePasswordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = password.trim();
      if (!trimmed) {
        setPasswordError("Password cannot be empty");
        return;
      }
      setPasswordError("");
      setConfirmOpen(true);
    }
  };

  return (
    <article
      aria-label={`Server ${displayName}`}
      className={`min-w-0 overflow-hidden rounded-none border bg-white/[0.03] shadow-none transition duration-300 ${isDown ? "border-white/20 ring-1 ring-white/10" : "border-white/10 hover:border-white/20"}`}
    >
      <header
        className={`flex min-w-0 flex-col gap-3 border-b border-white/10 px-3 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-4 ${isDown ? "border-l-4 border-l-white" : ""}`}
      >
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <h3 className="min-w-0 truncate text-base font-normal text-white sm:text-[17px]">
              {displayName}
            </h3>
            {isDown ? (
              <span className="inline-flex shrink-0 items-center gap-1 border border-white/20 bg-white/[0.06] px-2 py-1 text-[11px] font-normal uppercase tracking-[0.08em] text-white">
                <AlertTriangle size={13} />
                Down
              </span>
            ) : (
              <Badge variant={chipVariant(vps.status)}>
                {serverStatusLabel(vps.status)}
              </Badge>
            )}
            <Badge variant={isReady ? "ready" : "pending"}>
              {isLocalHost
                ? "Local agent"
                : isReady
                  ? "Key ready"
                  : "Needs password"}
            </Badge>
          </div>
          <p className="mt-1.5 break-all font-mono text-xs text-white/60 sm:text-[13px]">
            {vps.username}@{vps.host}:{vps.port}
          </p>
          <p
            className="mt-1 truncate font-mono text-[11px] text-white/40"
            title={`Server ID: ${vps.id}`}
          >
            ID {vps.id}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-xs text-white/50 sm:pt-0.5">
          <Clock3 size={14} aria-hidden="true" />
          <span>Seen {formatDate(vps.lastSeenAt)}</span>
        </div>
      </header>

      <div className="grid min-w-0 divide-y divide-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
        <ServerSystemInfoStrip vps={vps} systemInfo={systemInfo} />
        <ServerMetricStrip metric={metric} />
        <div className="min-w-0 p-3 sm:p-4">
          <DockerMetricsPanel
            vps={vps}
            dockerMetrics={dockerMetrics}
            busy={busy}
            onToggle={onToggleDockerMetrics}
          />
        </div>
      </div>

      <footer className="border-t border-white/10 px-3 py-3 sm:px-4">
        <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <ServerRuntimeMeta
            metric={metric}
            systemInfo={systemInfo}
            jobs={jobs}
          />
          <div className="flex min-w-0 flex-wrap items-center gap-2 xl:justify-end">
          <Link
            to={`/vps/${encodeURIComponent(vps.id)}`}
            aria-label={`Manage ${displayName}`}
            className="inline-flex h-9 min-w-0 items-center justify-center border border-white/10 bg-white/[0.03] px-3 text-sm font-normal text-white transition-colors hover:bg-white/[0.08]"
          >
            <Server size={16} />
            <span className="ml-2">Manage</span>
          </Link>
          {isLocalHost ? (
            <span className="inline-flex h-9 items-center gap-2 px-2 text-sm text-white/50">
              <Activity size={16} aria-hidden="true" />
              Managed locally
            </span>
          ) : isReady ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => onVerify(vps)}
              >
                <ShieldCheck size={16} />
                Verify access
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => setShowPassword((value) => !value)}
              >
                <KeyRound size={16} />
                Reinstall key
              </Button>
              <Button
                type="button"
                size="sm"
                variant="default"
                disabled={busy}
                onClick={() => onInstallAgent(vps)}
              >
                <DownloadCloud size={16} />
                Install agent
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => setShowPassword((value) => !value)}
              >
                <KeyRound size={16} />
                Install key
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => onVerify(vps)}
              >
                <ShieldCheck size={16} />
                Verify access
              </Button>
            </>
          )}
          <ServerOverflow
            vps={vps}
            busy={busy}
            isLocalHost={isLocalHost}
            onRotate={() => setShowPassword(true)}
            onRequestDelete={() => {
              window.setTimeout(() => setDeleteTarget(vps), 0);
            }}
          />
          </div>
        </div>
      </footer>
      {/* Delete confirmation – rendered outside DropdownMenu to avoid focus-trap nesting */}
      <AlertDialog
        open={deleteTarget?.id === vps.id}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the server record for {vps.username}@
              {vps.host}:{vps.port}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDelete(vps);
              }}
            >
              Delete server
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {showPassword && !isLocalHost ? (
        <form
          onSubmit={(event) => event.preventDefault()}
          autoComplete="off"
          className="grid gap-2 border-t border-white/10 bg-white/[0.02] px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-4"
        >
          <Label>
            {isReady ? "One-time password for rotation" : "One-time password"}
            <Input
              type="password"
              maxLength={4096}
              autoComplete="new-password"
              placeholder="Used once to install or rotate the key"
              value={password}
              onChange={(event) => {
                onPasswordChange(vps.id, event.target.value);
                if (passwordError) setPasswordError("");
              }}
              onKeyDown={handlePasswordKeyDown}
            />
            {passwordError ? (
              <p className="mt-1 text-xs font-normal text-white/50">
                {passwordError}
              </p>
            ) : null}
          </Label>
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                size="sm"
                disabled={busy || !password.trim()}
                className="self-end rounded-none"
              >
                <KeyRound size={16} />
                {isReady ? "Rotate key" : "Install key"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {isReady ? "Rotate SSH key?" : "Install SSH key?"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will connect to {displayName} and update authorized SSH
                  access using the one-time password. The password will not be
                  stored.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    onProvision(vps);
                  }}
                >
                  {isReady ? "Rotate key" : "Install key"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </form>
      ) : null}
    </article>
  );
}

// ── ServerRuntimeMeta ────────────────────────────────────────────────

function ServerRuntimeMeta({
  metric,
  systemInfo,
  jobs,
}: {
  metric?: DashboardOverview["metrics"][number];
  systemInfo?: DashboardOverview["systemInfo"][number];
  jobs: DashboardOverview["jobs"];
}) {
  const runningJobs = jobs.filter((job) => job.status === "running").length;
  const parts = [
    systemInfo?.agentVersion ? `Agent ${systemInfo.agentVersion}` : null,
    metric ? `Uptime ${formatUptime(metric.uptime)}` : null,
    metric ? `Last check ${freshnessLabel(metric.collectedAt)}` : null,
    `${runningJobs} running job${runningJobs === 1 ? "" : "s"}`,
  ].filter(Boolean);
  return (
    <div className="min-w-0 text-xs font-normal leading-5 text-white/50">
      <p className="whitespace-normal" title={parts.join(" / ")}>
        {parts.join(" · ")}
      </p>
    </div>
  );
}

// ── ServerSystemInfoStrip ────────────────────────────────────────────

function ServerSystemInfoStrip({
  vps,
  systemInfo,
}: {
  vps: VpsRecord;
  systemInfo?: DashboardOverview["systemInfo"][number];
}) {
  if (!systemInfo) {
    return (
      <section className="min-w-0 p-3 sm:p-4" aria-label="System information">
        <SectionLabel>System</SectionLabel>
        <p className="mt-2 text-xs font-normal text-white/40">
          System info not reported yet.
        </p>
        <ServerLocationMeta vps={vps} />
        <ServerAnnotations vps={vps} />
      </section>
    );
  }

  const osLabel =
    systemInfo.os?.prettyName ||
    systemInfo.os?.name ||
    systemInfo.os?.family ||
    "OS n/a";
  const kernelParts = [
    systemInfo.kernel?.release,
    systemInfo.kernel?.arch,
  ].filter(Boolean);
  const cpuLabel =
    [
      systemInfo.cpu?.cores ? `${systemInfo.cpu.cores} cores` : null,
      systemInfo.cpu?.model,
    ]
      .filter(Boolean)
      .join(" · ") || "CPU n/a";
  const memoryLabel = systemInfo.memory?.totalBytes
    ? `${formatBytes(systemInfo.memory.totalBytes)} RAM`
    : "RAM n/a";
  const diskLabel = systemInfo.rootDisk?.totalBytes
    ? `${formatBytes(systemInfo.rootDisk.totalBytes)} disk${systemInfo.rootDisk.fsType ? ` · ${systemInfo.rootDisk.fsType}` : ""}`
    : "Disk n/a";

  return (
    <section className="min-w-0 p-3 sm:p-4" aria-label="System information">
      <SectionLabel>System</SectionLabel>
      <p className="mt-2 truncate text-sm font-normal text-white/80" title={osLabel}>
        {osLabel}
      </p>
      <div className="mt-1 grid gap-0.5 text-xs leading-5 text-white/50">
        <p className="truncate" title={kernelParts.join(" · ") || undefined}>
          {kernelParts.length ? kernelParts.join(" · ") : "Kernel n/a"}
        </p>
        <p className="truncate" title={cpuLabel}>{cpuLabel}</p>
        <p className="truncate" title={`${memoryLabel} · ${diskLabel}`}>
          {memoryLabel} · {diskLabel}
        </p>
      </div>
      <ServerLocationMeta vps={vps} />
      <ServerAnnotations vps={vps} />
    </section>
  );
}

function ServerLocationMeta({ vps }: { vps: VpsRecord }) {
  return (
    <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-white/40">
      <span className="inline-flex min-w-0 items-center gap-1">
        <ServerCog size={12} aria-hidden="true" />
        <span className="truncate">{vps.provider || "Provider not set"}</span>
      </span>
      <span aria-hidden="true">·</span>
      <span className="inline-flex min-w-0 items-center gap-1">
        <MapPin size={12} aria-hidden="true" />
        <span className="truncate">{vps.region || "Region not set"}</span>
      </span>
    </div>
  );
}

function ServerAnnotations({ vps }: { vps: VpsRecord }) {
  return (
    <>
      {vps.tags?.length ? (
        <p
          className="mt-2 truncate text-[11px] text-white/40"
          title={`Tags: ${vps.tags.join(", ")}`}
        >
          Tags · {vps.tags.join(", ")}
        </p>
      ) : null}
      {vps.notes ? (
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/50">
          {vps.notes}
        </p>
      ) : null}
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-normal uppercase tracking-[0.14em] text-white/50">
      {children}
    </p>
  );
}

// ── ServerMetricStrip ────────────────────────────────────────────────

function ServerMetricStrip({
  metric,
}: {
  metric?: DashboardOverview["metrics"][number];
}) {
  const base = "flex items-baseline justify-between gap-3 text-xs text-white/70";
  return (
    <section className="min-w-0 p-3 sm:p-4" aria-label="Resource usage">
      <SectionLabel>Resources</SectionLabel>
      <div className="mt-2 grid gap-2.5">
        <TelemetryMeter label="CPU" value={metric?.cpu} />
        <TelemetryMeter label="RAM" value={metric?.memory} />
        <TelemetryMeter label="Disk" value={metric?.disk} />
        <p className={base}>
          <span className="text-white/50">Load</span>
          <span>{metric ? metric.loadAverage : "n/a"}</span>
        </p>
      </div>
    </section>
  );
}

function TelemetryMeter({ label, value }: { label: string; value?: number }) {
  const hasValue = typeof value === "number" && Number.isFinite(value);
  const normalizedValue = hasValue ? Math.min(100, Math.max(0, value)) : 0;
  const meterColor = !hasValue
    ? "bg-white/20"
    : value >= 90
      ? "bg-red-500"
      : value >= 70
        ? "bg-amber-400"
        : "bg-emerald-500";

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="text-white/50">{label}</span>
        <span className="text-white/70">{hasValue ? `${value}%` : "n/a"}</span>
      </div>
      {hasValue ? (
        <div
          role="progressbar"
          aria-label={`${label} utilization`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={normalizedValue}
          className="mt-1.5 h-1 w-full overflow-hidden bg-white/10"
        >
          <div
            className={`h-full ${meterColor} transition-[width] duration-300`}
            style={{ width: `${normalizedValue}%` }}
          />
        </div>
      ) : (
        <div className="mt-1.5 h-1 w-full bg-white/10" aria-hidden="true" />
      )}
    </div>
  );
}

// ── ServerOverflow ───────────────────────────────────────────────────

function ServerOverflow({
  vps,
  busy,
  isLocalHost,
  onRotate,
  onRequestDelete,
}: {
  vps: VpsRecord;
  busy: boolean;
  isLocalHost: boolean;
  onRotate: () => void;
  onRequestDelete: () => void;
}) {
  const displayName = vpsDisplayName(vps);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label={`More actions for ${displayName}`}
        >
          <MoreHorizontal size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-none">
        <DropdownMenuItem asChild>
          <Link
            to={`/vps/${encodeURIComponent(vps.id)}/terminal`}
            className="flex items-center gap-2"
          >
            <TerminalSquare size={15} />
            Open terminal
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            to={`/vps/${encodeURIComponent(vps.id)}/metrics`}
            className="flex items-center gap-2"
          >
            <Activity size={15} />
            View metrics
          </Link>
        </DropdownMenuItem>
        {isLocalHost ? (
          <DropdownMenuItem disabled>
            <Activity size={15} />
            Managed by local agent
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onRotate} disabled={busy}>
            <RotateCw size={15} />
            {vps.keyProvisionedAt ? "Rotate key" : "Install key"}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem disabled>
          <Edit3 size={15} />
          Edit server
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          disabled={busy || isLocalHost}
          onClick={onRequestDelete}
        >
          <Trash2 size={15} />
          Delete server
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
