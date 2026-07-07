import { useState, type FormEvent, type ReactNode } from "react";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
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
import {
  chipVariant,
  formatDate,
  freshnessLabel,
  serverStatusLabel,
} from "../../../lib/dashboard-formatters";
import type { DashboardOverview, VpsRecord } from "../../../lib/api";
import { formatUptime } from "../shared/formatUptime";
import { EmptyState } from "../shared/EmptyState";
import { SummaryPill } from "../shared/SummaryPill";

type ServersPanelProps = {
  records: VpsRecord[];
  visibleRecords: VpsRecord[];
  statusMessage: ReactNode;
  serverSearch: string;
  statusFilter: string;
  busy: boolean;
  provisionPasswords: Record<string, string>;
  createForm: {
    name: string;
    host: string;
    port: string;
    username: string;
    password: string;
  };
  metrics: DashboardOverview["metrics"];
  systemInfo: DashboardOverview["systemInfo"];
  dockerMetrics: DashboardOverview["dockerMetrics"];
  jobs: DashboardOverview["jobs"];
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onCreateFormChange: (value: ServersPanelProps["createForm"]) => void;
  onCreate: (event: FormEvent<HTMLFormElement>) => void;
  onPasswordChange: (id: string, value: string) => void;
  onProvision: (vps: VpsRecord) => void;
  onVerify: (vps: VpsRecord) => void;
  onInstallAgent: (vps: VpsRecord) => void;
  onToggleDockerMetrics: (vps: VpsRecord) => void;
  onDelete: (vps: VpsRecord) => void;
};

export function ServersPanel(props: ServersPanelProps) {
  const metricById = new Map(
    props.metrics.map((metric) => [metric.vpsId, metric]),
  );
  const systemInfoById = new Map(
    (props.systemInfo ?? []).map((info) => [info.vpsId, info]),
  );
  const dockerMetricsById = new Map(
    (props.dockerMetrics ?? []).map((metric) => [metric.vpsId, metric]),
  );
  return (
    <div className="grid min-w-0 max-w-full gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
      <section className="min-w-0 space-y-4">
        <Card className="min-w-0 overflow-hidden border border-[#ded8bd]/80 bg-white/95 shadow-panel backdrop-blur">
          <CardHeader className="min-w-0 border-b border-[#ded8bd]/70 bg-[#f6f3ec] pb-4">
            <p className="truncate text-[11px] font-black uppercase tracking-[0.2em] text-[#161612]">Fleet inventory</p>
            <CardTitle className="truncate text-[#161612]">Servers</CardTitle>
            <CardDescription>
              Search, filter, install keys, and verify access.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 space-y-4">
            <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
              <Input
                aria-label="Search servers"
                placeholder="Search name, host, provider, tag..."
                value={props.serverSearch}
                onChange={(event) => props.onSearchChange(event.target.value)}
              />
              <select
                aria-label="Filter status"
                className="h-10 min-w-0 w-full rounded-md border border-[#ded8bd] bg-white px-3 text-sm font-semibold text-[#4a4532] outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/20"
                value={props.statusFilter}
                onChange={(event) =>
                  props.onStatusFilterChange(event.target.value)
                }
              >
                <option value="all">All states</option>
                <option value="healthy">Healthy</option>
                <option value="warning">Warning</option>
                <option value="unreachable">Down</option>
                <option value="ready">Key ready</option>
                <option value="pending">Needs password</option>
              </select>
            </div>
            {props.statusMessage}
            {props.records.length === 0 ? (
              <EmptyState>
                No VPS servers yet. Add your first server with the form beside
                this list.
              </EmptyState>
            ) : props.visibleRecords.length === 0 ? (
              <EmptyState>No servers match this filter.</EmptyState>
            ) : (
              <div className="grid min-w-0 gap-2">
                {props.visibleRecords.map((vps) => (
                  <ServerCard
                    key={vps.id}
                    vps={vps}
                    metric={metricById.get(vps.id)}
                    systemInfo={systemInfoById.get(vps.id)}
                    dockerMetrics={dockerMetricsById.get(vps.id)}
                    jobs={props.jobs.filter((job) => job.vpsId === vps.id)}
                    busy={props.busy}
                    password={props.provisionPasswords[vps.id] || ""}
                    onPasswordChange={props.onPasswordChange}
                    onProvision={props.onProvision}
                    onVerify={props.onVerify}
                    onInstallAgent={props.onInstallAgent}
                    onToggleDockerMetrics={props.onToggleDockerMetrics}
                    onDelete={props.onDelete}
                  />
                ))}
              </div>
            )}
            <ServerOpsSummary records={props.records} metrics={props.metrics} />
          </CardContent>
        </Card>
      </section>
      <CreateServerCard {...props} />
    </div>
  );
}

function CreateServerCard({
  createForm,
  busy,
  onCreate,
  onCreateFormChange,
}: ServersPanelProps) {
  return (
    <Card className="h-fit min-w-0 overflow-hidden border border-[#ded8bd]/80 bg-white/95 shadow-panel backdrop-blur xl:sticky xl:top-5">
      <CardHeader className="min-w-0 border-b border-[#ded8bd] bg-[#161612] pb-4 text-white">
        <p className="truncate text-[11px] font-black uppercase tracking-[0.2em] text-[#a3a3a3]">
          Add server
        </p>
        <CardTitle className="truncate text-white">New VPS</CardTitle>
        <CardDescription className="text-white/58">
          Password is optional and never stored.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={onCreate}
          autoComplete="off"
          className="grid min-w-0 gap-4"
        >
          <fieldset className="grid gap-3">
            <legend className="mb-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#746d59]">
              Basic info
            </legend>
            <Label>
              Name
              <Input
                required
                maxLength={120}
                placeholder="prod-sgp-01"
                value={createForm.name}
                onChange={(event) =>
                  onCreateFormChange({
                    ...createForm,
                    name: event.target.value,
                  })
                }
              />
            </Label>
            <Label>
              Host / IP
              <Input
                required
                maxLength={255}
                placeholder="203.0.113.20"
                value={createForm.host}
                onChange={(event) =>
                  onCreateFormChange({
                    ...createForm,
                    host: event.target.value,
                  })
                }
              />
            </Label>
          </fieldset>
          <fieldset className="grid gap-3">
            <legend className="mb-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#746d59]">
              SSH access
            </legend>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <Label>
                Port
                <Input
                  required
                  type="number"
                  min={1}
                  max={65535}
                  value={createForm.port}
                  onChange={(event) =>
                    onCreateFormChange({
                      ...createForm,
                      port: event.target.value,
                    })
                  }
                />
              </Label>
              <Label>
                Username
                <Input
                  required
                  maxLength={64}
                  placeholder="root"
                  value={createForm.username}
                  onChange={(event) =>
                    onCreateFormChange({
                      ...createForm,
                      username: event.target.value,
                    })
                  }
                />
              </Label>
            </div>
          </fieldset>
          <fieldset className="grid gap-3">
            <legend className="mb-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#746d59]">
              Key provisioning
            </legend>
            <Label>
              Optional password
              <Input
                type="password"
                maxLength={4096}
                autoComplete="new-password"
                placeholder="One-time key install"
                value={createForm.password}
                onChange={(event) =>
                  onCreateFormChange({
                    ...createForm,
                    password: event.target.value,
                  })
                }
              />
            </Label>
          </fieldset>
          <Button type="submit" disabled={busy} className="min-w-0 rounded-md">
            <Server size={18} />
            <span className="truncate">Create VPS</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ServerCard({
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
  onProvision: ServersPanelProps["onProvision"];
  onVerify: ServersPanelProps["onVerify"];
  onInstallAgent: ServersPanelProps["onInstallAgent"];
  onToggleDockerMetrics: ServersPanelProps["onToggleDockerMetrics"];
  onDelete: ServersPanelProps["onDelete"];
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
      className={`min-w-0 rounded-md border px-4 py-4 shadow-[0_10px_28px_rgba(13,14,18,0.04)] transition duration-300 ${isDown ? "border-[#ded8bd] bg-[#fffdf2]/70 shadow-[#161612]/5 ring-1 ring-[#fff0a3]" : "border-[#ded8bd]/90 bg-white hover:-translate-y-0.5 hover:border-[#161612]/30 hover:shadow-[0_18px_38px_rgba(13,14,18,0.08)]"}`}
    >
      <div
        className={`grid gap-4 xl:grid-cols-[minmax(320px,1.25fr)_minmax(230px,0.8fr)_minmax(220px,0.55fr)_auto] xl:items-center ${isDown ? "border-l-4 border-neutral-500 pl-3" : ""}`}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-[17px] font-bold tracking-[-0.03em] text-[#161612]">
              {vps.name}
            </h3>
            {isDown ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#ded8bd] bg-[#fff7cc] px-2 py-0.5 text-xs font-black uppercase text-[#4a4532]">
                <AlertTriangle size={13} />
                Down
              </span>
            ) : (
              <Badge variant={chipVariant(vps.status)}>
                {serverStatusLabel(vps.status)}
              </Badge>
            )}
            <Badge variant={isReady ? "ready" : "pending"}>
              {isLocalHost ? "Local agent" : isReady ? "Key ready" : "Needs password"}
            </Badge>
          </div>
          <p className="mt-1 break-all text-sm font-semibold leading-6 text-[#5f5946]">
            {vps.username}@{vps.host}:{vps.port}
          </p>
          <p className="mt-1 break-all font-mono text-xs font-bold text-[#746d59]">
            ID: {vps.id}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] font-bold text-[#746d59]">
            <span className="flex items-center gap-1.5">
              <ServerCog size={14} />
              {vps.provider || "Provider not set"}
            </span>
            <span className="text-neutral-300">/</span>
            <span className="flex items-center gap-1.5">
              <MapPin size={14} />
              {vps.region || "Region not set"}
            </span>
            <span className="text-neutral-300">/</span>
            <span className="flex items-center gap-1.5">
              <Clock3 size={14} />
              Seen {formatDate(vps.lastSeenAt)}
            </span>
          </div>
          {vps.tags?.length ? (
            <p
              className="mt-2 truncate text-xs font-bold text-[#746d59]"
              title={`Tags: ${vps.tags.join(", ")}`}
            >
              <span className="font-black uppercase tracking-[0.08em] text-[#9b9278]">
                Tags:
              </span>{" "}
              {vps.tags.join(", ")}
            </p>
          ) : null}
          {vps.notes ? (
            <p className="mt-2 line-clamp-2 text-sm leading-5 text-[#746d59]">
              {vps.notes}
            </p>
          ) : null}
          <ServerSystemInfoStrip systemInfo={systemInfo} />
        </div>
        <ServerRuntimeMeta metric={metric} systemInfo={systemInfo} jobs={jobs} />
        <ServerMetricStrip metric={metric} />
        <DockerMetricsPanel
          vps={vps}
          dockerMetrics={dockerMetrics}
          busy={busy}
          onToggle={onToggleDockerMetrics}
        />
        <div className="flex min-w-0 flex-wrap items-start justify-start gap-2 xl:justify-end">
          {isLocalHost ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="border border-[#ded8bd] bg-[#fffdf2] text-[#2f2d22] shadow-sm hover:bg-[#fffdf2] disabled:opacity-100"
                disabled
              >
                <Activity size={16} />
                Managed locally
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="border border-[#cfc49a] bg-white text-[#161612] shadow-sm hover:bg-[#fff7cc] disabled:opacity-100"
                disabled
              >
                <Activity size={16} />
                Metrics
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
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="border border-[#cfc49a] bg-white text-[#161612] shadow-sm hover:bg-[#fff7cc] disabled:opacity-100"
                disabled
              >
                <Activity size={16} />
                Metrics
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
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {vps.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the server record for {vps.username}@{vps.host}:{vps.port}. This cannot be undone.
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
          className="mt-3 grid gap-2 border-t border-[#ded8bd] pt-3 sm:grid-cols-[minmax(0,1fr)_auto]"
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
              <p className="mt-1 text-xs font-semibold text-[#5f5946]">{passwordError}</p>
            ) : null}
          </Label>
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                size="sm"
                disabled={busy || !password.trim()}
                className="self-end rounded-md"
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
                  This will connect to {vps.name} and update authorized SSH access using the one-time password. The password will not be stored.
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
    <div className="min-w-0 rounded-md border border-[#ded8bd] bg-[#fffdf2]/90 px-3 py-2 text-[12px] font-bold leading-5 text-[#5f5946] shadow-sm">
      <p className="truncate" title={parts.join(" / ")}>
        {parts.join(" / ")}
      </p>
    </div>
  );
}

function ServerSystemInfoStrip({
  systemInfo,
}: {
  systemInfo?: DashboardOverview["systemInfo"][number];
}) {
  if (!systemInfo) {
    return (
      <div className="mt-3 rounded-md border border-dashed border-[#ded8bd] bg-[#fffdf2]/70 px-3 py-2 text-xs font-bold text-[#9b9278]">
        System info not reported yet.
      </div>
    );
  }

  const osLabel = systemInfo.os?.prettyName || systemInfo.os?.name || systemInfo.os?.family || "OS n/a";
  const kernelParts = [systemInfo.kernel?.release, systemInfo.kernel?.arch].filter(Boolean);
  const cpuLabel = [
    systemInfo.cpu?.cores ? `${systemInfo.cpu.cores} cores` : null,
    systemInfo.cpu?.model,
  ].filter(Boolean).join(" · ") || "CPU n/a";
  const memoryLabel = systemInfo.memory?.totalBytes
    ? `${formatBytes(systemInfo.memory.totalBytes)} RAM`
    : "RAM n/a";
  const diskLabel = systemInfo.rootDisk?.totalBytes
    ? `${formatBytes(systemInfo.rootDisk.totalBytes)} disk${systemInfo.rootDisk.fsType ? ` · ${systemInfo.rootDisk.fsType}` : ""}`
    : "Disk n/a";

  return (
    <div className="mt-3 grid gap-2 rounded-md border border-[#ded8bd] bg-gradient-to-br from-neutral-50 to-white px-3 py-2 text-xs text-[#5f5946] shadow-sm">
      <p className="truncate font-black text-[#2f2d22]" title={osLabel}>
        {osLabel}
      </p>
      <div className="flex flex-wrap gap-x-2 gap-y-1 font-bold">
        <span className="truncate" title={kernelParts.join(" · ") || undefined}>
          {kernelParts.length ? kernelParts.join(" · ") : "Kernel n/a"}
        </span>
        <span className="text-neutral-300">/</span>
        <span className="truncate" title={cpuLabel}>{cpuLabel}</span>
        <span className="text-neutral-300">/</span>
        <span>{memoryLabel}</span>
        <span className="text-neutral-300">/</span>
        <span>{diskLabel}</span>
      </div>
    </div>
  );
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "n/a";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let next = value;
  let index = 0;
  while (next >= 1024 && index < units.length - 1) {
    next /= 1024;
    index += 1;
  }
  return `${next >= 10 || index === 0 ? next.toFixed(0) : next.toFixed(1)} ${units[index]}`;
}

function formatDockerError(errorCode?: string): string {
  const labels: Record<string, string> = {
    socket_missing: "Docker socket missing",
    permission_denied: "Permission denied",
    timeout: "Docker timed out",
    daemon_unreachable: "Docker daemon unreachable",
    unsupported_os: "Unsupported OS",
    bad_response: "Bad Docker response",
  };
  return labels[errorCode || ""] || "Docker unavailable";
}

function DockerMetricsPanel({
  vps,
  dockerMetrics,
  busy,
  onToggle,
}: {
  vps: VpsRecord;
  dockerMetrics?: DashboardOverview["dockerMetrics"][number];
  busy: boolean;
  onToggle: ServersPanelProps["onToggleDockerMetrics"];
}) {
  const enabled = vps.dockerMetricsEnabled === true;
  const topContainers = (dockerMetrics?.containers ?? [])
    .slice()
    .sort((a, b) => b.cpuPercent - a.cpuPercent)
    .slice(0, 3);

  let body: ReactNode;
  if (!enabled) {
    body = <p className="text-xs font-bold text-[#746d59]">Docker metrics off.</p>;
  } else if (!dockerMetrics) {
    body = <p className="text-xs font-bold text-[#4a4532]">Waiting for Docker-capable agent.</p>;
  } else if (!dockerMetrics.available) {
    body = (
      <div className="space-y-1">
        <p className="text-xs font-black text-[#2f2d22]">{formatDockerError(dockerMetrics.errorCode)}</p>
        <p className="text-[11px] font-semibold text-[#746d59]">Check Docker socket access for the agent.</p>
      </div>
    );
  } else {
    body = (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5 text-[11px] font-black text-[#4a4532]">
          <span className="rounded-full bg-white px-2 py-0.5 shadow-sm">{dockerMetrics.containerRunning}/{dockerMetrics.containerTotal} running</span>
          <span className="rounded-full bg-white px-2 py-0.5 shadow-sm">CPU {dockerMetrics.cpuPercent.toFixed(1)}%</span>
          <span className="rounded-full bg-white px-2 py-0.5 shadow-sm">RAM {formatBytes(dockerMetrics.memoryUsageBytes)}</span>
          <span className="rounded-full bg-white px-2 py-0.5 shadow-sm">Net {formatBytes(dockerMetrics.networkRxBytes + dockerMetrics.networkTxBytes)}</span>
          <span className="rounded-full bg-white px-2 py-0.5 shadow-sm">IO {formatBytes(dockerMetrics.blockReadBytes + dockerMetrics.blockWriteBytes)}</span>
        </div>
        {topContainers.length ? (
          <div className="grid gap-1">
            {topContainers.map((container) => (
              <p key={container.id} className="truncate text-[11px] font-bold text-[#5f5946]" title={`${container.name} · ${container.image} · ${container.status}`}>
                <span className="text-[#161612]">{container.name}</span> · {container.state} · {container.cpuPercent.toFixed(1)}% · {formatBytes(container.memoryUsageBytes)}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-[#ded8bd] bg-[#fffdf2]/90 px-3 py-2 shadow-sm">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] font-black uppercase tracking-[0.12em] text-[#746d59]">Docker</span>
        <Button
          type="button"
          size="sm"
          variant={enabled ? "secondary" : "outline"}
          className="h-7 rounded-sm px-2 text-[11px]"
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

function ServerMetricStrip({
  metric,
}: {
  metric?: DashboardOverview["metrics"][number];
}) {
  const base =
    "rounded-sm border border-[#ded8bd] bg-[#fffdf2] px-2.5 py-1 text-[12px] font-black text-[#2f2d22] shadow-[0_1px_0_rgba(15,23,42,0.03)]";
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
        <span className="text-[#746d59]">CPU</span> {metric.cpu}%
      </span>
      <span className={base}>
        <span className="text-[#746d59]">RAM</span> {metric.memory}%
      </span>
      <span className={base}>
        <span className="text-[#746d59]">Disk</span> {metric.disk}%
      </span>
      <span className={base}>
        <span className="text-[#746d59]">Load</span> {metric.loadAverage}
      </span>
    </div>
  );
}

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
      <DropdownMenuContent align="end" className="w-48 rounded-md">
        <DropdownMenuItem disabled>
          <TerminalSquare size={15} />
          Open terminal
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Activity size={15} />
          View metrics
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

function ServerOpsSummary({
  records,
  metrics,
}: {
  records: VpsRecord[];
  metrics: DashboardOverview["metrics"];
}) {
  const ready = records.filter((server) => server.kind === "local" || server.managedBy === "system" || server.keyProvisionedAt).length;
  const down = records.filter(
    (server) => server.status === "unreachable",
  ).length;
  const regions = records.reduce<Record<string, number>>((acc, server) => {
    const key = server.region || "Unassigned";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const regionText =
    Object.entries(regions)
      .slice(0, 3)
      .map(([region, count]) => `${region} ${count}`)
      .join(" \u00b7 ") || "None";
  const hottest = metrics.length
    ? [...metrics].sort((a, b) => b.cpu - a.cpu)[0]
    : null;
  return (
    <section
      className="grid grid-cols-1 gap-3 border-t border-[#ded8bd] pt-4 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Server operations summary"
    >
      <SummaryPill
        label="SSH keys"
        value={`${ready}/${records.length} ready`}
      />
      <SummaryPill
        label="Down"
        value={`${down}`}
        tone={down ? "red" : "default"}
      />
      <SummaryPill label="Regions" value={regionText} />
      <SummaryPill
        label="Hottest CPU"
        value={hottest ? `${hottest.vpsId} ${hottest.cpu}%` : "No metrics"}
      />
    </section>
  );
}
