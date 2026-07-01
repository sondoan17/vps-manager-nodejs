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
  jobs: DashboardOverview["jobs"];
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onCreateFormChange: (value: ServersPanelProps["createForm"]) => void;
  onCreate: (event: FormEvent<HTMLFormElement>) => void;
  onPasswordChange: (id: string, value: string) => void;
  onProvision: (vps: VpsRecord) => void;
  onVerify: (vps: VpsRecord) => void;
  onInstallAgent: (vps: VpsRecord) => void;
  onDelete: (vps: VpsRecord) => void;
};

export function ServersPanel(props: ServersPanelProps) {
  const metricById = new Map(
    props.metrics.map((metric) => [metric.vpsId, metric]),
  );
  return (
    <div className="grid min-w-0 max-w-full gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
      <section className="min-w-0 space-y-4">
        <Card className="min-w-0 overflow-hidden border border-slate-200 bg-white shadow-sm">
          <CardHeader className="min-w-0 pb-3">
            <CardTitle className="truncate">Servers</CardTitle>
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
                className="h-10 min-w-0 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-ring"
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
                    jobs={props.jobs.filter((job) => job.vpsId === vps.id)}
                    busy={props.busy}
                    password={props.provisionPasswords[vps.id] || ""}
                    onPasswordChange={props.onPasswordChange}
                    onProvision={props.onProvision}
                    onVerify={props.onVerify}
                    onInstallAgent={props.onInstallAgent}
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
    <Card className="h-fit min-w-0 overflow-hidden border border-slate-200 bg-white shadow-sm">
      <CardHeader className="min-w-0 pb-3">
        <p className="truncate text-xs font-black uppercase tracking-[0.18em] text-accent">
          Add server
        </p>
        <CardTitle className="truncate">New VPS</CardTitle>
        <CardDescription>
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
            <legend className="mb-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
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
            <legend className="mb-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
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
            <legend className="mb-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
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
          <Button type="submit" disabled={busy} className="min-w-0 rounded-xl">
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
  jobs,
  busy,
  password,
  onPasswordChange,
  onProvision,
  onVerify,
  onInstallAgent,
  onDelete,
}: {
  vps: VpsRecord;
  metric?: DashboardOverview["metrics"][number];
  jobs: DashboardOverview["jobs"];
  busy: boolean;
  password: string;
  onPasswordChange: (id: string, value: string) => void;
  onProvision: ServersPanelProps["onProvision"];
  onVerify: ServersPanelProps["onVerify"];
  onInstallAgent: ServersPanelProps["onInstallAgent"];
  onDelete: ServersPanelProps["onDelete"];
}) {
  const isReady = Boolean(vps.keyProvisionedAt);
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
      className={`min-w-0 rounded-xl border bg-white px-4 py-4 shadow-sm transition ${isDown ? "border-red-200 bg-red-50/45 shadow-red-950/5 ring-1 ring-red-100" : "border-slate-200 hover:border-slate-300"}`}
    >
      <div
        className={`grid gap-4 xl:grid-cols-[minmax(320px,1.25fr)_minmax(230px,0.8fr)_minmax(220px,0.55fr)_auto] xl:items-center ${isDown ? "border-l-4 border-red-500 pl-3" : ""}`}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-[17px] font-black tracking-tight text-slate-950">
              {vps.name}
            </h3>
            {isDown ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-xs font-black uppercase text-red-700">
                <AlertTriangle size={13} />
                Down
              </span>
            ) : (
              <Badge variant={chipVariant(vps.status)}>
                {serverStatusLabel(vps.status)}
              </Badge>
            )}
            <Badge variant={isReady ? "ready" : "pending"}>
              {isReady ? "Key ready" : "Needs password"}
            </Badge>
          </div>
          <p className="mt-1 break-all text-sm font-semibold leading-6 text-slate-600">
            {vps.username}@{vps.host}:{vps.port}
          </p>
          <p className="mt-1 break-all font-mono text-xs font-bold text-slate-500">
            ID: {vps.id}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[13px] font-bold text-slate-500">
            <span className="flex items-center gap-1.5">
              <ServerCog size={14} />
              {vps.provider || "Provider not set"}
            </span>
            <span className="text-slate-300">/</span>
            <span className="flex items-center gap-1.5">
              <MapPin size={14} />
              {vps.region || "Region not set"}
            </span>
            <span className="text-slate-300">/</span>
            <span className="flex items-center gap-1.5">
              <Clock3 size={14} />
              Seen {formatDate(vps.lastSeenAt)}
            </span>
          </div>
          {vps.tags?.length ? (
            <p
              className="mt-2 truncate text-xs font-bold text-slate-500"
              title={`Tags: ${vps.tags.join(", ")}`}
            >
              <span className="font-black uppercase tracking-[0.08em] text-slate-400">
                Tags:
              </span>{" "}
              {vps.tags.join(", ")}
            </p>
          ) : null}
          {vps.notes ? (
            <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-500">
              {vps.notes}
            </p>
          ) : null}
        </div>
        <ServerRuntimeMeta metric={metric} jobs={jobs} />
        <ServerMetricStrip metric={metric} />
        <div className="flex min-w-0 flex-wrap items-start justify-start gap-2 xl:justify-end">
          {isReady ? (
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
                className="border border-slate-300 bg-white text-slate-900 shadow-sm hover:bg-slate-100 disabled:opacity-100"
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
      {showPassword ? (
        <form
          onSubmit={(event) => event.preventDefault()}
          autoComplete="off"
          className="mt-3 grid gap-2 border-t border-slate-200 pt-3 sm:grid-cols-[minmax(0,1fr)_auto]"
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
              <p className="mt-1 text-xs font-semibold text-red-600">{passwordError}</p>
            ) : null}
          </Label>
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                size="sm"
                disabled={busy || !password.trim()}
                className="self-end rounded-xl"
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
  jobs,
}: {
  metric?: DashboardOverview["metrics"][number];
  jobs: DashboardOverview["jobs"];
}) {
  const runningJobs = jobs.filter((job) => job.status === "running").length;
  const parts = [
    metric ? `Uptime ${formatUptime(metric.uptime)}` : null,
    metric ? `Last check ${freshnessLabel(metric.collectedAt)}` : null,
    `${runningJobs} running job${runningJobs === 1 ? "" : "s"}`,
  ].filter(Boolean);
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-[12px] font-bold leading-5 text-slate-600 shadow-sm">
      <p className="truncate" title={parts.join(" / ")}>
        {parts.join(" / ")}
      </p>
    </div>
  );
}

function ServerMetricStrip({
  metric,
}: {
  metric?: DashboardOverview["metrics"][number];
}) {
  const base =
    "rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] font-black text-slate-800 shadow-[0_1px_0_rgba(15,23,42,0.03)]";
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
        <span className="text-slate-500">CPU</span> {metric.cpu}%
      </span>
      <span className={base}>
        <span className="text-slate-500">RAM</span> {metric.memory}%
      </span>
      <span className={base}>
        <span className="text-slate-500">Disk</span> {metric.disk}%
      </span>
      <span className={base}>
        <span className="text-slate-500">Load</span> {metric.loadAverage}
      </span>
    </div>
  );
}

function ServerOverflow({
  vps,
  busy,
  onRotate,
  onRequestDelete,
}: {
  vps: VpsRecord;
  busy: boolean;
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
      <DropdownMenuContent align="end" className="w-48 rounded-xl">
        <DropdownMenuItem disabled>
          <TerminalSquare size={15} />
          Open terminal
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Activity size={15} />
          View metrics
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onRotate} disabled={busy}>
          <RotateCw size={15} />
          {vps.keyProvisionedAt ? "Rotate key" : "Install key"}
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Edit3 size={15} />
          Edit server
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          disabled={busy}
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
  const ready = records.filter((server) => server.keyProvisionedAt).length;
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
      className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2 xl:grid-cols-4"
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
