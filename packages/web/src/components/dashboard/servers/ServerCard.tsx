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
      className={`min-w-0 rounded-none border px-4 py-4 shadow-none transition duration-300 ${isDown ? "border-white/10 bg-white/[0.03] shadow-black/5 ring-1 ring-white/10" : "border-0 bg-white/[0.03] shadow-none  hover:border-white/20 "}`}
    >
      <div
        className={`grid gap-4 xl:grid-cols-[minmax(320px,1.25fr)_minmax(230px,0.8fr)_minmax(220px,0.55fr)_auto] xl:items-center ${isDown ? "border-l-4 border-[#ffffff] pl-3" : ""}`}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-[17px] font-normal tracking-normal text-[#ffffff]">
              {vps.name}
            </h3>
            {isDown ? (
              <span className="inline-flex items-center gap-1 rounded-none border border-white/10 bg-white/[0.03] px-2 py-0.5 text-xs font-normal uppercase text-white/70">
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
          <p className="mt-1 break-all text-sm font-normal leading-6 text-white/50">
            {vps.username}@{vps.host}:{vps.port}
          </p>
          <p className="mt-1 break-all font-mono text-xs font-normal text-white/50">
            ID: {vps.id}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] font-normal text-white/50">
            <span className="flex items-center gap-1.5">
              <ServerCog size={14} />
              {vps.provider || "Provider not set"}
            </span>
            <span className="text-white/50">/</span>
            <span className="flex items-center gap-1.5">
              <MapPin size={14} />
              {vps.region || "Region not set"}
            </span>
            <span className="text-white/50">/</span>
            <span className="flex items-center gap-1.5">
              <Clock3 size={14} />
              Seen {formatDate(vps.lastSeenAt)}
            </span>
          </div>
          {vps.tags?.length ? (
            <p
              className="mt-2 truncate text-xs font-normal text-white/50"
              title={`Tags: ${vps.tags.join(", ")}`}
            >
              <span className="font-normal uppercase tracking-[0.08em] text-white/30">
                Tags:
              </span>{" "}
              {vps.tags.join(", ")}
            </p>
          ) : null}
          {vps.notes ? (
            <p className="mt-2 line-clamp-2 text-sm leading-5 text-white/50">
              {vps.notes}
            </p>
          ) : null}
          <ServerSystemInfoStrip systemInfo={systemInfo} />
        </div>
        <ServerRuntimeMeta
          metric={metric}
          systemInfo={systemInfo}
          jobs={jobs}
        />
        <ServerMetricStrip metric={metric} />
        <DockerMetricsPanel
          vps={vps}
          dockerMetrics={dockerMetrics}
          busy={busy}
          onToggle={onToggleDockerMetrics}
        />
        <div className="flex min-w-0 flex-wrap items-start justify-start gap-2 xl:justify-end">
          <>
            <Link
              to={`/vps/${encodeURIComponent(vps.id)}`}
              className="inline-flex items-center justify-center min-w-0 h-9 rounded-none px-4 text-sm font-normal transition-colors border border-white/10 bg-white/[0.03] text-[#ffffff] shadow-none hover:bg-white/[0.03]"
            >
              <Server size={16} />
              <span className="ml-2">Manage</span>
            </Link>
          </>
          {isLocalHost ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="border-0 bg-white/[0.03] shadow-none text-white/70 shadow-none hover:bg-white/[0.03] disabled:opacity-100"
                disabled
              >
                <Activity size={16} />
                Managed locally
              </Button>
            </>
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
      {/* Delete confirmation – rendered outside DropdownMenu to avoid focus-trap nesting */}
      <AlertDialog
        open={deleteTarget?.id === vps.id}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {vps.name}?</AlertDialogTitle>
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
          className="mt-3 grid gap-2 border-t border-white/10 pt-3 sm:grid-cols-[minmax(0,1fr)_auto]"
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
                  This will connect to {vps.name} and update authorized SSH
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
    <div className="min-w-0 rounded-none border-0 bg-white/[0.03] shadow-none/90 px-3 py-2 text-[12px] font-normal leading-5 text-white/50 shadow-none">
      <p className="truncate" title={parts.join(" / ")}>
        {parts.join(" / ")}
      </p>
    </div>
  );
}

// ── ServerSystemInfoStrip ────────────────────────────────────────────

function ServerSystemInfoStrip({
  systemInfo,
}: {
  systemInfo?: DashboardOverview["systemInfo"][number];
}) {
  if (!systemInfo) {
    return (
      <div className="mt-3 rounded-none border border-dashed border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-normal text-white/30">
        System info not reported yet.
      </div>
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
    <div className="mt-3 grid gap-2 rounded-none border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/50 shadow-none">
      <p className="truncate font-normal text-white/70" title={osLabel}>
        {osLabel}
      </p>
      <div className="flex flex-wrap gap-x-2 gap-y-1 font-normal">
        <span className="truncate" title={kernelParts.join(" · ") || undefined}>
          {kernelParts.length ? kernelParts.join(" · ") : "Kernel n/a"}
        </span>
        <span className="text-white/50">/</span>
        <span className="truncate" title={cpuLabel}>
          {cpuLabel}
        </span>
        <span className="text-white/50">/</span>
        <span>{memoryLabel}</span>
        <span className="text-white/50">/</span>
        <span>{diskLabel}</span>
      </div>
    </div>
  );
}

// ── ServerMetricStrip ────────────────────────────────────────────────

function ServerMetricStrip({
  metric,
}: {
  metric?: DashboardOverview["metrics"][number];
}) {
  const base =
    "rounded-none border-0 bg-white/[0.03] shadow-none px-2.5 py-1 text-[12px] font-normal text-white/70 shadow-none";
  if (!metric)
    return (
      <div className="flex flex-wrap items-center gap-1.5 xl:justify-end">
        <span className={base}>CPU n/a</span>
        <span className={base}>RAM n/a</span>
        <span className={base}>Disk n/a</span>
        <span className={base}>Load n/a</span>
      </div>
    );
  return (
    <div className="flex flex-wrap items-center gap-1.5 xl:justify-end">
      <span className={base}>
        <span className="text-white/50">CPU</span> {metric.cpu}%
      </span>
      <span className={base}>
        <span className="text-white/50">RAM</span> {metric.memory}%
      </span>
      <span className={base}>
        <span className="text-white/50">Disk</span> {metric.disk}%
      </span>
      <span className={base}>
        <span className="text-white/50">Load</span> {metric.loadAverage}
      </span>
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label={`More actions for ${vps.name}`}
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
