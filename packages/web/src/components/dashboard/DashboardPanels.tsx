import { useState, type FormEvent, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  Copy,
  Cpu,
  Edit3,
  HardDrive,
  KeyRound,
  MapPin,
  MemoryStick,
  MoreHorizontal,
  Network,
  RotateCw,
  Server,
  ServerCog,
  ShieldCheck,
  TerminalSquare,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { Alert } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "../ui/drawer";
import { ScrollArea } from "../ui/scroll-area";
import {
  chipVariant,
  formatDate,
  freshnessLabel,
  serverStatusLabel,
} from "../../lib/dashboard-formatters";
import type { DashboardOverview, VpsRecord } from "../../lib/api";

export function DemoBanner({ overview }: { overview: DashboardOverview }) {
  if (!overview.banner) return null;
  return (
    <Alert className="mb-4 rounded-2xl border-0 bg-white/75 text-primary shadow-sm ring-1 ring-primary/10">
      {overview.banner}
    </Alert>
  );
}

export function OverviewPanel({ overview }: { overview: DashboardOverview }) {
  const avg = (key: "cpu" | "memory" | "disk") =>
    overview.metrics.length
      ? Math.round(
          overview.metrics.reduce((sum, metric) => sum + metric[key], 0) /
            overview.metrics.length,
        )
      : 0;
  const avgNetworkRx = overview.metrics.length
    ? Math.round(
        overview.metrics.reduce((sum, metric) => sum + metric.networkRx, 0) /
          overview.metrics.length,
      )
    : 0;
  const avgNetworkTx = overview.metrics.length
    ? Math.round(
        overview.metrics.reduce((sum, metric) => sum + metric.networkTx, 0) /
          overview.metrics.length,
      )
    : 0;
  const warningTotal =
    overview.summary.warningServers + overview.summary.unreachableServers;

  function findTrend(unit?: string) {
    return overview.metrics.find((m) => m.trend?.unit === unit)?.trend ?? null;
  }

  const cpuTrend = findTrend("cpu");
  const memTrend = findTrend("memory");
  const diskTrend = findTrend("disk");
  const netTrend = findTrend("network") || findTrend();

  return (
    <div className="min-w-0 space-y-4 overflow-visible">
      <section
        className="grid min-w-0 gap-3 xl:grid-cols-3"
        aria-label="Operations overview"
      >
        <HeroStat
          tone="healthy"
          label="Fleet health"
          title={`${overview.summary.healthyServers} healthy`}
          detail={`${overview.summary.totalServers} total · ${warningTotal} need attention`}
          icon={Server}
        />
        <HeroStat
          tone="work"
          label="Key & job status"
          title={`${overview.summary.runningJobs} running`}
          detail="Provisioning and verification queue"
          icon={KeyRound}
        />
        <HeroStat
          tone="load"
          label="Resource balance"
          title={`${avg("cpu")}% CPU`}
          detail={`${avg("memory")}% RAM · ${avg("disk")}% disk`}
          icon={Activity}
        />
      </section>
      <DemoBanner overview={overview} />
      <section className="grid min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <TrendCard
          label="CPU load"
          value={`${avg("cpu")}%`}
          detail={
            cpuTrend
              ? `${cpuTrend.range} · min ${cpuTrend.min}% max ${cpuTrend.max}%`
              : `${overview.metrics.length} backend samples`
          }
          icon={Cpu}
          tone="cyan"
          trend={cpuTrend}
        />
        <TrendCard
          label="Memory pressure"
          value={`${avg("memory")}%`}
          detail={
            memTrend
              ? `${memTrend.range} · min ${memTrend.min}% max ${memTrend.max}%`
              : "No backend trend"
          }
          icon={MemoryStick}
          tone="violet"
          trend={memTrend}
        />
        <TrendCard
          label="Disk usage"
          value={`${avg("disk")}%`}
          detail={
            diskTrend
              ? `${diskTrend.range} · min ${diskTrend.min}% max ${diskTrend.max}%`
              : `across ${overview.metrics.length} servers`
          }
          icon={HardDrive}
          tone="amber"
          trend={diskTrend}
        />
        <TrendCard
          label="Network in/out"
          value={`${formatBytes(avgNetworkRx)}/${formatBytes(avgNetworkTx)}`}
          detail={
            netTrend
              ? `${netTrend.range} · min ${netTrend.min}${netTrend.unit || ""} max ${netTrend.max}${netTrend.unit || ""}`
              : "No backend trend"
          }
          icon={Network}
          tone="slate"
          trend={netTrend}
        />
      </section>
      <div className="grid min-w-0 max-w-full gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <AuditPanel events={overview.auditEvents.slice(0, 5)} compact />
        <JobsPanel jobs={overview.jobs.slice(0, 5)} compact />
      </div>
    </div>
  );
}

function HeroStat({
  tone,
  label,
  title,
  detail,
  icon: Icon,
}: {
  tone: "healthy" | "work" | "load";
  label: string;
  title: string;
  detail: string;
  icon: LucideIcon;
}) {
  const tones = {
    healthy:
      "border-emerald-500/30 bg-slate-950 text-white before:bg-emerald-400 text-emerald-200",
    work: "border-amber-500/30 bg-slate-900 text-white before:bg-amber-400 text-amber-200",
    load: "border-indigo-500/30 bg-slate-900 text-white before:bg-indigo-400 text-indigo-200",
  };
  return (
    <article
      className={`${tones[tone]} before:absolute before:inset-x-0 before:top-0 before:h-1 relative min-h-28 min-w-0 overflow-hidden rounded-[1.15rem] border p-4 pt-5 shadow-sm shadow-slate-950/10 sm:min-h-32`}
    >
      <div className="absolute -right-10 -top-12 h-24 w-24 rounded-full bg-current/10 blur-2xl" />
      <div className="relative flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            {label}
          </p>
          <h2 className="mt-1 truncate font-display text-2xl text-white sm:text-[1.7rem]">
            {title}
          </h2>
          <p className="mt-1 truncate text-[15px] font-semibold leading-6 text-slate-300">
            {detail}
          </p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/10 text-current">
          <Icon size={20} />
        </span>
      </div>
    </article>
  );
}

function TrendCard({
  label,
  value,
  detail,
  icon: Icon,
  trend,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  trend?: {
    points: number[];
    min: number;
    max: number;
    threshold: number;
    range?: string;
    unit?: string;
  } | null;
  tone: "cyan" | "violet" | "amber" | "slate";
}) {
  const stroke = {
    cyan: "#06b6d4",
    violet: "#6366f1",
    amber: "#d97706",
    slate: "#334155",
  }[tone];
  const points = trend?.points ?? [];
  const normalized = points.map((point) => Math.min(92, Math.max(8, point)));
  const polyline = normalized
    .map(
      (point, index) =>
        `${normalized.length > 1 ? (index / (normalized.length - 1)) * 100 : 50},${54 - point / 2}`,
    )
    .join(" ");
  const max = trend?.max ?? null;
  const min = trend?.min ?? null;
  const threshold = trend?.threshold ?? null;
  const range = trend?.range ?? null;
  const isHot = max != null && threshold != null ? max >= threshold : false;
  return (
    <Card
      className={`min-w-0 overflow-hidden border-slate-200 bg-white shadow-sm ${isHot ? "ring-2 ring-orange-200" : ""}`}
    >
      <CardContent className="p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              {label}
            </p>
            <strong className="mt-1 block truncate text-2xl font-black text-slate-950">
              {value}
            </strong>
            <p className="mt-1 truncate text-[15px] font-semibold leading-6 text-slate-500">
              {detail}
            </p>
          </div>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
            <Icon size={18} />
          </span>
        </div>
        {trend ? (
          <>
            <div className="mt-3 flex items-center justify-between gap-2 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
              <span>Last {range}</span>
              <span className={isHot ? "text-orange-600" : "text-slate-500"}>
                threshold {threshold}%
              </span>
            </div>
            <svg
              className="mt-2 h-14 w-full overflow-visible"
              viewBox="0 0 100 56"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <line
                x1="0"
                y1="14"
                x2="100"
                y2="14"
                stroke={isHot ? "#f97316" : "#cbd5e1"}
                strokeDasharray="4 4"
              />
              <polyline
                points={polyline}
                fill="none"
                stroke={isHot ? "#f97316" : stroke}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1="0"
                y1="44"
                x2="100"
                y2="44"
                stroke="#e2e8f0"
                strokeDasharray="4 4"
              />
            </svg>
            <div className="mt-1 flex items-center justify-between text-sm font-bold leading-6 text-slate-500">
              <span>min {min}%</span>
              <span>max {max}%</span>
            </div>
          </>
        ) : (
          <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm font-bold text-slate-400">
            No backend trend data
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
  onProvision: (vps: VpsRecord, event: FormEvent<HTMLFormElement>) => void;
  onVerify: (vps: VpsRecord) => void;
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
  onDelete: ServersPanelProps["onDelete"];
}) {
  const isReady = Boolean(vps.keyProvisionedAt);
  const isDown = vps.status === "unreachable";
  const [showPassword, setShowPassword] = useState(false);
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
            onDelete={onDelete}
          />
        </div>
      </div>
      {showPassword ? (
        <form
          onSubmit={(event) => onProvision(vps, event)}
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
              onChange={(event) => onPasswordChange(vps.id, event.target.value)}
            />
          </Label>
          <Button
            type="submit"
            size="sm"
            disabled={busy}
            className="self-end rounded-xl"
          >
            <KeyRound size={16} />
            {isReady ? "Rotate key" : "Install key"}
          </Button>
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

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  if (days >= 1) return `${days}d`;
  const hours = Math.floor(seconds / 3600);
  if (hours >= 1) return `${hours}h`;
  return `${Math.max(0, Math.floor(seconds / 60))}m`;
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
  onDelete,
}: {
  vps: VpsRecord;
  busy: boolean;
  onRotate: () => void;
  onDelete: ServersPanelProps["onDelete"];
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
          onClick={() => onDelete(vps)}
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

function SummaryPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "red";
}) {
  return (
    <div
      className={`min-w-0 rounded-xl border px-3.5 py-3 shadow-sm ${tone === "red" ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}
    >
      <p className="text-[11px] font-black uppercase tracking-[0.12em] opacity-75">
        {label}
      </p>
      <p
        className="mt-1 whitespace-normal break-words text-[15px] font-black leading-5"
        title={value}
      >
        {value}
      </p>
    </div>
  );
}
export function JobsPanel({
  jobs,
  compact = false,
}: {
  jobs: DashboardOverview["jobs"];
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"compact" | "detailed">("compact");
  const running = jobs.filter((job) => job.status === "running").length;
  const failed = jobs.filter((job) => job.status === "failed").length;
  const queued = jobs.filter((job) => job.status === "queued").length;
  const workers = new Set(jobs.map((job) => job.workerId).filter(Boolean)).size;
  const completed = jobs.filter(
    (job) => job.status === "succeeded" || job.status === "failed",
  ).length;
  const succeeded = jobs.filter((job) => job.status === "succeeded").length;
  const successRate = completed ? Math.round((succeeded / completed) * 100) : 0;
  const jobTypes = Array.from(new Set(jobs.map((job) => job.type))).sort();
  const visibleJobs = jobs.filter((job) => {
    const haystack = [
      job.type,
      job.id,
      job.vpsId,
      job.workerId,
      job.status,
      job.errorMessage,
      job.outputPreview,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return (
      haystack.includes(query.trim().toLowerCase()) &&
      (statusFilter === "all" || job.status === statusFilter) &&
      (typeFilter === "all" || job.type === typeFilter)
    );
  });

  if (compact) {
    return (
      <Card className="min-w-0 max-w-full overflow-hidden border-slate-200">
        <CardHeader className="min-w-0 p-4 pb-3 sm:p-5 sm:pb-4">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="truncate text-xl font-black">
              Recent jobs
            </CardTitle>
            <Badge
              variant={failed ? "destructive" : running ? "pending" : "outline"}
            >
              {running} running
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid min-w-0 max-w-full gap-3 overflow-hidden p-4 pt-0 sm:p-5 sm:pt-0">
          {jobs.length ? (
            jobs
              .slice(0, 5)
              .map((job) => <CompactJobRow key={job.id} job={job} />)
          ) : (
            <EmptyState>No jobs yet.</EmptyState>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="min-w-0 max-w-full overflow-hidden border-slate-200 bg-white shadow-sm">
      <CardHeader className="min-w-0 p-4 pb-3 sm:p-5 sm:pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-xl font-black">Jobs</CardTitle>
            <CardDescription>
              Background work across provisioning, metrics, and key checks.
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1 shadow-inner">
              <Button
                type="button"
                variant={viewMode === "compact" ? "secondary" : "ghost"}
                size="sm"
                className="h-9 rounded-xl px-3 text-xs font-black"
                onClick={() => setViewMode("compact")}
              >
                Compact view
              </Button>
              <Button
                type="button"
                variant={viewMode === "detailed" ? "secondary" : "ghost"}
                size="sm"
                className="h-9 rounded-xl px-3 text-xs font-black"
                onClick={() => setViewMode("detailed")}
              >
                Detailed view
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-1 rounded-xl border-slate-300 bg-white text-sm font-black shadow-sm"
            >
              Logs
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid min-w-0 max-w-full gap-4 overflow-hidden p-4 pt-0 sm:p-5 sm:pt-0">
        <section
          className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(0,1fr)_170px_190px]"
          aria-label="Jobs filters"
        >
          <Input
            aria-label="Search jobs"
            placeholder="Search jobs..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            aria-label="Filter job status"
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-ring"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="queued">Queued</option>
            <option value="running">Running</option>
            <option value="succeeded">Succeeded</option>
            <option value="failed">Failed</option>
          </select>
          <select
            aria-label="Filter job type"
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-ring"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="all">All types</option>
            {jobTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </section>
        {visibleJobs.length ? (
          <div className="grid gap-2">
            {visibleJobs.map((job) =>
              viewMode === "compact" ? (
                <JobCompactListRow key={job.id} job={job} />
              ) : (
                <JobCard key={job.id} job={job} />
              ),
            )}
          </div>
        ) : (
          <EmptyState>No jobs match these filters.</EmptyState>
        )}
        <section
          className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2 xl:grid-cols-5"
          aria-label="Jobs summary"
        >
          <SummaryPill label="Workers" value={`${workers || 0}`} />
          <SummaryPill label="Running" value={`${running}`} />
          <SummaryPill label="Queued" value={`${queued}`} />
          <SummaryPill
            label="Failed"
            value={`${failed}`}
            tone={failed ? "red" : "default"}
          />
          <SummaryPill
            label="Success rate"
            value={completed ? `${successRate}%` : "n/a"}
          />
        </section>
      </CardContent>
    </Card>
  );
}

function CompactJobRow({ job }: { job: DashboardOverview["jobs"][number] }) {
  const progress = Math.min(100, Math.max(0, job.progress));
  return (
    <article className="grid min-w-0 gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <strong
            className="block truncate text-[17px] font-black leading-6 text-slate-950"
            title={job.type}
          >
            {job.type}
          </strong>
          <p
            className="mt-1 truncate text-[15px] font-semibold leading-6 text-slate-500"
            title={`${job.vpsId} \u00b7 ${progress}% progress`}
          >
            {job.vpsId} · {job.workerId || "Worker n/a"} · {progress}% progress
          </p>
        </div>
        <Badge className="shrink-0 uppercase" variant={chipVariant(job.status)}>
          {job.status}
        </Badge>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-cyan-600"
          style={{ width: `${progress}%` }}
        />
      </div>
    </article>
  );
}

function JobCompactListRow({
  job,
}: {
  job: DashboardOverview["jobs"][number];
}) {
  const progress = Math.min(100, Math.max(0, job.progress));
  const isFailed = job.status === "failed";
  const isRunning = job.status === "running";
  const isQueued = job.status === "queued";
  const durationText =
    job.durationMs != null
      ? `${(job.durationMs / 1000).toFixed(0)}s`
      : "duration n/a";
  const meta = [
    job.vpsId,
    job.workerId || "worker n/a",
    durationText,
    `${job.retryCount ?? 0} retries`,
    job.startedAt ? `started ${freshnessLabel(job.startedAt)}` : null,
  ]
    .filter(Boolean)
    .join(" \u00b7 ");
  return (
    <article
      className={`grid min-w-0 gap-2 rounded-xl border px-3 py-2.5 shadow-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-center ${isFailed ? "border-red-200 bg-red-50/70" : isRunning ? "border-cyan-200 bg-cyan-50/40 ring-1 ring-cyan-100" : "border-slate-200 bg-white"}`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <strong
            className="truncate text-[15px] font-black text-slate-950"
            title={job.type}
          >
            {job.type}
          </strong>
          <JobStatusBadge status={job.status} />
          <span className="truncate font-mono text-[11px] font-bold text-slate-400">
            {job.id}
          </span>
        </div>
        <p
          className="mt-1 truncate text-xs font-bold text-slate-500"
          title={meta}
        >
          {meta}
        </p>
        {isQueued ? (
          <p className="mt-1 text-xs font-bold text-slate-500">
            Queued / {job.outputPreview || "Waiting for an available worker."}
          </p>
        ) : null}
        {isFailed && job.errorMessage ? (
          <p className="mt-1 line-clamp-2 text-xs font-bold text-red-700">
            {job.errorMessage}
          </p>
        ) : null}
        {!isQueued ? (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${isFailed ? "bg-red-500" : isRunning ? "bg-cyan-500" : "bg-slate-400"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        {!isQueued ? (
          <span className="min-w-12 text-right text-xs font-black text-slate-500">
            {progress}%
          </span>
        ) : null}
        {job.errorLogUrl ? (
          <Button
            type="button"
            asChild
            variant={
              isFailed ? "destructive" : isRunning ? "secondary" : "outline"
            }
            size="sm"
            className={`h-8 rounded-lg text-xs font-black ${isRunning ? "border border-cyan-200 bg-cyan-50 text-cyan-900 hover:bg-cyan-100" : ""}`}
          >
            <a href={job.errorLogUrl} target="_blank" rel="noopener noreferrer">
              View log
            </a>
          </Button>
        ) : null}
        {isRunning ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg text-xs font-black"
            disabled
          >
            Cancel
          </Button>
        ) : null}
        {isFailed ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg border-red-200 text-xs font-black text-red-700"
            disabled
          >
            Retry
          </Button>
        ) : null}
        <JobOverflow job={job} />
      </div>
    </article>
  );
}

function JobCard({ job }: { job: DashboardOverview["jobs"][number] }) {
  const progress = Math.min(100, Math.max(0, job.progress));
  const durationText =
    job.durationMs != null
      ? `${(job.durationMs / 1000).toFixed(0)}s`
      : "Duration n/a";
  const retryText = `${job.retryCount ?? 0} retries`;
  const timeBits = [
    job.startedAt ? `Started ${freshnessLabel(job.startedAt)}` : null,
    job.finishedAt ? `Finished ${freshnessLabel(job.finishedAt)}` : null,
  ].filter(Boolean);
  const isFailed = job.status === "failed";
  const isRunning = job.status === "running";
  const isQueued = job.status === "queued";
  const inlineMeta = [
    job.vpsId,
    job.workerId || "Worker n/a",
    durationText,
    retryText,
    ...timeBits,
  ].join(" \u00b7 ");
  return (
    <article
      className={`grid min-w-0 gap-3 rounded-xl border p-4 shadow-sm ${isFailed ? "border-red-200 bg-red-50/60 ring-1 ring-red-100" : "border-slate-200 bg-white"}`}
    >
      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <strong
              className="truncate text-lg font-black leading-6 text-slate-950"
              title={job.type}
            >
              {job.type}
            </strong>
            <JobStatusBadge status={job.status} />
          </div>
          <p className="mt-1 break-all font-mono text-xs font-bold text-slate-500">
            {job.id}
          </p>
          <p className="mt-2 text-sm font-bold leading-5 text-slate-600">
            {inlineMeta}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          {job.errorLogUrl ? (
            <Button
              type="button"
              asChild
              variant={
                isFailed ? "destructive" : isRunning ? "secondary" : "outline"
              }
              size="sm"
              className={`rounded-xl ${isRunning ? "border border-cyan-200 bg-cyan-50 text-cyan-900 hover:bg-cyan-100" : ""}`}
            >
              <a
                href={job.errorLogUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View log
              </a>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled
            >
              View log
            </Button>
          )}
          {isRunning ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled
              title="Cancel is not wired to an API yet"
            >
              Cancel
            </Button>
          ) : null}
          {isFailed ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl border-red-200 text-red-700 hover:bg-red-50"
              disabled
              title="Retry is not wired to an API yet"
            >
              Retry
            </Button>
          ) : null}
          <JobOverflow job={job} />
        </div>
      </div>
      {isQueued ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold leading-5 text-slate-600">
          Queued / {job.outputPreview || "Waiting for an available worker."}
        </p>
      ) : (
        <div>
          <div className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${isFailed ? "bg-red-500" : isRunning ? "bg-cyan-500" : "bg-cyan-600"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      {job.errorMessage ? (
        <p className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-bold leading-5 text-red-700">
          {job.errorMessage}
        </p>
      ) : job.outputPreview && !isQueued ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold leading-5 text-slate-600">
          {job.outputPreview}
        </p>
      ) : null}
    </article>
  );
}

function JobStatusBadge({
  status,
}: {
  status: DashboardOverview["jobs"][number]["status"];
}) {
  if (status === "running")
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-100 px-2 py-0.5 text-xs font-black uppercase text-cyan-800">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-600" />
        Running
      </span>
    );
  return (
    <Badge className="uppercase" variant={chipVariant(status)}>
      {status}
    </Badge>
  );
}

function JobOverflow({ job }: { job: DashboardOverview["jobs"][number] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-lg px-2"
          aria-label={`More actions for ${job.id}`}
        >
          <MoreHorizontal size={15} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="z-[80] w-44 rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20"
      >
        <DropdownMenuItem disabled className="opacity-45">
          Restart worker
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="opacity-45">
          Open server
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigator.clipboard?.writeText(job.id)}
        >
          Copy job id
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
export function MetricsPanel({
  metrics,
}: {
  metrics: DashboardOverview["metrics"];
}) {
  const [serverFilter, setServerFilter] = useState("all");
  const [metricFilter, setMetricFilter] = useState("all");
  const serverIds = Array.from(
    new Set(metrics.map((metric) => metric.vpsId)),
  ).sort();
  const visibleMetrics = metrics.filter(
    (metric) => serverFilter === "all" || metric.vpsId === serverFilter,
  );
  const fresh = metrics.filter((metric) => metric.freshness === "fresh").length;
  const stale = metrics.filter((metric) => metric.freshness === "stale").length;
  const highestCpu = maxMetric(metrics, "cpu");
  const highestDisk = maxMetric(metrics, "disk");
  const highestMemory = maxMetric(metrics, "memory");
  const highestLoad = metrics.length
    ? [...metrics].sort((a, b) => b.loadAverage - a.loadAverage)[0]
    : null;
  const alerts = buildMetricAlerts(metrics);
  return (
    <Card className="min-w-0 overflow-hidden border-slate-200 bg-white shadow-sm">
      <CardHeader className="p-4 pb-3 sm:p-5 sm:pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl font-black">Metrics</CardTitle>
            <CardDescription>
              Telemetry freshness and resource usage by server.
            </CardDescription>
          </div>
          <Badge variant={stale ? "pending" : "ready"}>
            {fresh}/{metrics.length} fresh
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 pt-0 sm:p-5 sm:pt-0">
        <section
          className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(0,1fr)_190px]"
          aria-label="Metrics filters"
        >
          <select
            aria-label="Filter metrics server"
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-ring"
            value={serverFilter}
            onChange={(event) => setServerFilter(event.target.value)}
          >
            <option value="all">All servers</option>
            {serverIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter metric type"
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-ring"
            value={metricFilter}
            onChange={(event) => setMetricFilter(event.target.value)}
          >
            <option value="all">All metrics</option>
            <option value="cpu">CPU</option>
            <option value="memory">Memory</option>
            <option value="disk">Disk</option>
            <option value="load">Load</option>
            <option value="network">Network</option>
          </select>
        </section>
        <section
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5"
          aria-label="Metrics summary"
        >
          <MetricSummaryCard
            label="Fresh servers"
            server="Telemetry"
            value={`${fresh}/${metrics.length}`}
          />
          <MetricSummaryCard
            label="Stale metrics"
            server="Attention"
            value={`${stale}`}
            tone={stale ? "red" : "default"}
          />
          <MetricSummaryCard
            label="Highest CPU"
            server={highestCpu?.vpsId || "n/a"}
            value={highestCpu ? `${highestCpu.cpu}%` : "n/a"}
          />
          <MetricSummaryCard
            label="Highest disk"
            server={highestDisk?.vpsId || "n/a"}
            value={highestDisk ? `${highestDisk.disk}%` : "n/a"}
          />
          <MetricSummaryCard
            label="Peak load"
            server={highestLoad?.vpsId || "n/a"}
            value={highestLoad ? String(highestLoad.loadAverage) : "n/a"}
          />
        </section>
        {visibleMetrics.length ? (
          <section className="grid gap-3" aria-label="Server metrics">
            {visibleMetrics.map((metric) => (
              <MetricServerCard
                key={metric.vpsId}
                metric={metric}
                focus={metricFilter}
              />
            ))}
          </section>
        ) : (
          <EmptyState>No metrics match these filters.</EmptyState>
        )}
        <section
          className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-2 xl:grid-cols-4"
          aria-label="Metric trends"
        >
          <TrendMini metric={highestCpu} label="CPU trend" unit="%" />
          <TrendMini metric={highestMemory} label="Memory trend" unit="%" />
          <TrendMini metric={highestDisk} label="Disk trend" unit="%" />
          <TrendMini
            metric={
              metrics.find((metric) => metric.trend?.unit === "network") ||
              metrics[0]
            }
            label="Network trend"
            unit=""
          />
        </section>
        <section
          className="rounded-xl border border-slate-200 bg-white p-4"
          aria-label="Recent metric alerts"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-black text-slate-950">Recent metric alerts</h3>
            <Badge variant={alerts.length ? "pending" : "ready"}>
              {alerts.length} alerts
            </Badge>
          </div>
          {alerts.length ? (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
              <div className="hidden grid-cols-[0.8fr_1fr_minmax(0,1.5fr)_0.8fr_auto] gap-3 bg-slate-100 px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-slate-500 md:grid">
                <span>Severity</span>
                <span>Server</span>
                <span>Message</span>
                <span>Last check</span>
                <span>Action</span>
              </div>
              <div className="divide-y divide-slate-200">
                {alerts.map((alert) => (
                  <article
                    key={`${alert.vpsId}-${alert.message}`}
                    className="grid gap-2 px-3 py-2 text-sm font-bold text-slate-600 md:grid-cols-[0.8fr_1fr_minmax(0,1.5fr)_0.8fr_auto] md:items-center"
                  >
                    <Badge
                      className="w-fit uppercase"
                      variant={
                        alert.severity === "critical"
                          ? "destructive"
                          : "pending"
                      }
                    >
                      {alert.severity}
                    </Badge>
                    <span
                      className="truncate font-black text-slate-800"
                      title={alert.vpsId}
                    >
                      {alert.vpsId}
                    </span>
                    <span className="min-w-0 text-slate-600">
                      {alert.message}
                    </span>
                    <span className="text-xs font-black text-slate-500">
                      {alert.time}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-fit rounded-xl text-xs font-bold"
                      disabled
                      title="Coming soon"
                    >
                      View metric
                    </Button>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm font-bold text-slate-500">
              No resource warnings from current metrics.
            </p>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

function maxMetric(
  metrics: DashboardOverview["metrics"],
  key: "cpu" | "memory" | "disk",
) {
  return metrics.length
    ? [...metrics].sort((a, b) => b[key] - a[key])[0]
    : null;
}

function MetricSummaryCard({
  label,
  server,
  value,
  tone = "default",
}: {
  label: string;
  server: string;
  value: string;
  tone?: "default" | "red";
}) {
  return (
    <div
      className={`min-w-0 rounded-xl border px-3.5 py-3 shadow-sm ${tone === "red" ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}
    >
      <p className="text-[11px] font-black uppercase tracking-[0.12em] opacity-75">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-bold opacity-70" title={server}>
        {server}
      </p>
      <p className="mt-1 text-2xl font-black leading-none">{value}</p>
    </div>
  );
}

function MetricServerCard({
  metric,
  focus,
}: {
  metric: DashboardOverview["metrics"][number];
  focus: string;
}) {
  const stale = metric.freshness === "stale";
  const warnings = [
    metric.cpu >= 85 ? "High CPU" : null,
    metric.memory >= 80 ? "Memory pressure" : null,
    metric.disk >= 85 ? "Disk near limit" : null,
    stale ? "Stale telemetry" : null,
  ].filter(Boolean);
  return (
    <article
      className={`grid min-w-0 gap-3 rounded-xl border p-4 shadow-sm xl:grid-cols-[minmax(220px,1fr)_minmax(360px,1.4fr)_auto] xl:items-center ${stale ? "border-amber-200 bg-amber-50/60 ring-1 ring-amber-100" : "border-slate-200 bg-white"}`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="truncate text-lg font-black text-slate-950">
            {metric.vpsId}
          </strong>
          <Badge className="uppercase" variant={chipVariant(metric.freshness)}>
            {metric.freshness}
          </Badge>
        </div>
        <p className="mt-1 text-sm font-bold text-slate-500">
          Collected {freshnessLabel(metric.collectedAt)} · Uptime{" "}
          {formatUptime(metric.uptime)}
        </p>
        {warnings.length ? (
          <p className="mt-2 text-xs font-black uppercase tracking-[0.08em] text-amber-700">
            {warnings.join(" · ")}
          </p>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <MetricMini
          label="CPU"
          value={`${metric.cpu}%`}
          hot={metric.cpu >= 85 || focus === "cpu"}
        />
        <MetricMini
          label="RAM"
          value={`${metric.memory}%`}
          hot={metric.memory >= 80 || focus === "memory"}
        />
        <MetricMini
          label="Disk"
          value={`${metric.disk}%`}
          hot={metric.disk >= 85 || focus === "disk"}
        />
        <MetricMini
          label="Load"
          value={String(metric.loadAverage)}
          hot={focus === "load"}
        />
        <MetricMini
          label="Net"
          value={`${formatBytes(metric.networkRx)}/${formatBytes(metric.networkTx)}`}
          hot={focus === "network"}
        />
      </div>
      <div className="flex flex-wrap gap-2 xl:justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl text-xs font-bold"
          disabled
          title="Coming soon"
        >
          View details
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl text-xs font-bold"
          disabled
          title="Coming soon"
        >
          Open server
        </Button>
      </div>
    </article>
  );
}

function MetricMini({
  label,
  value,
  hot = false,
}: {
  label: string;
  value: string;
  hot?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-lg border px-3 py-2 ${hot ? "border-cyan-200 bg-cyan-50 text-cyan-900" : "border-slate-200 bg-slate-50 text-slate-700"}`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.1em] opacity-70">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-black" title={value}>
        {value}
      </p>
    </div>
  );
}

function TrendMini({
  metric,
  label,
  unit,
}: {
  metric?: DashboardOverview["metrics"][number] | null;
  label: string;
  unit: string;
}) {
  if (!metric?.trend)
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-white p-3 text-sm font-bold text-slate-400">
        {label}: no trend
      </div>
    );
  const points = metric.trend.points;
  const maxPoint = Math.max(...points, 1);
  const polyline = points
    .map(
      (point, index) =>
        `${(index / Math.max(points.length - 1, 1)) * 100},${48 - (point / maxPoint) * 38}`,
    )
    .join(" ");
  const thresholdY =
    48 -
    (metric.trend.threshold / Math.max(maxPoint, metric.trend.threshold)) * 38;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-500">
            {metric.vpsId} · {metric.trend.range}
          </p>
        </div>
        <div className="text-right text-xs font-black text-slate-500">
          <p>
            max {metric.trend.max}
            {unit}
          </p>
          <p>
            min {metric.trend.min}
            {unit}
          </p>
        </div>
      </div>
      <svg
        className="mt-3 h-28 w-full overflow-visible"
        viewBox="0 0 100 56"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line
          x1="0"
          x2="100"
          y1={thresholdY}
          y2={thresholdY}
          stroke="#f97316"
          strokeDasharray="4 4"
          strokeWidth="1.5"
        />
        <polyline
          points={polyline}
          fill="none"
          stroke="#06b6d4"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line x1="0" x2="100" y1="50" y2="50" stroke="#e2e8f0" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">
        <span>{metric.trend.range}</span>
        <span>30m</span>
        <span>15m</span>
        <span>now</span>
      </div>
    </div>
  );
}

function buildMetricAlerts(metrics: DashboardOverview["metrics"]) {
  return metrics.flatMap(
    (metric) =>
      [
        metric.freshness === "stale"
          ? {
              vpsId: metric.vpsId,
              severity: "stale",
              message: "Telemetry is stale",
              time: freshnessLabel(metric.collectedAt),
            }
          : null,
        metric.memory >= 80
          ? {
              vpsId: metric.vpsId,
              severity: "critical",
              message: `Memory pressure at ${metric.memory}%`,
              time: freshnessLabel(metric.collectedAt),
            }
          : metric.memory >= 75
            ? {
                vpsId: metric.vpsId,
                severity: "warning",
                message: `Memory nearing threshold at ${metric.memory}%`,
                time: freshnessLabel(metric.collectedAt),
              }
            : null,
        metric.disk >= 85
          ? {
              vpsId: metric.vpsId,
              severity: "critical",
              message: `Disk near limit at ${metric.disk}%`,
              time: freshnessLabel(metric.collectedAt),
            }
          : metric.disk >= 75
            ? {
                vpsId: metric.vpsId,
                severity: "warning",
                message: `Disk usage warning at ${metric.disk}%`,
                time: freshnessLabel(metric.collectedAt),
              }
            : null,
        metric.cpu >= 85
          ? {
              vpsId: metric.vpsId,
              severity: "critical",
              message: `High CPU at ${metric.cpu}%`,
              time: freshnessLabel(metric.collectedAt),
            }
          : null,
      ].filter(Boolean) as Array<{
        vpsId: string;
        severity: "warning" | "stale" | "critical";
        message: string;
        time: string;
      }>,
  );
}

function formatBytes(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}
export function AuditPanel({
  events,
  compact = false,
}: {
  events: DashboardOverview["auditEvents"];
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actorFilter, setActorFilter] = useState("all");
  const [serverFilter, setServerFilter] = useState("all");
  const [quickFilter, setQuickFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<
    DashboardOverview["auditEvents"][number] | null
  >(null);
  const actors = Array.from(
    new Set(events.map((event) => event.actor || "system")),
  );
  const servers = Array.from(
    new Set(
      events
        .map((event) => event.serverLabel || event.resourceId)
        .filter(Boolean) as string[],
    ),
  );
  const visibleEvents = events.filter((event) => {
    const severity =
      event.severity || (event.result === "success" ? "info" : "warning");
    const target =
      event.serverLabel ||
      event.resourceId ||
      event.resourceType ||
      "dashboard";
    const text = [
      event.actionLabel,
      event.eventCode,
      event.action,
      event.actor,
      target,
      event.result,
      event.sourceIp,
      event.requestId,
      event.reason,
      event.jobId,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesQuick =
      quickFilter === "all" ||
      (quickFilter === "critical" && severity === "critical") ||
      (quickFilter === "failures" && event.result === "failure") ||
      (quickFilter === "security" &&
        (event.action.includes("ssh") ||
          event.resourceType === "vps" ||
          event.authMethod)) ||
      (quickFilter === "terminal" && event.resourceType === "terminal");
    return (
      text.includes(query.trim().toLowerCase()) &&
      (severityFilter === "all" || severity === severityFilter) &&
      (statusFilter === "all" || event.result === statusFilter) &&
      (actorFilter === "all" || (event.actor || "system") === actorFilter) &&
      (serverFilter === "all" || target === serverFilter) &&
      matchesQuick
    );
  });
  const summary = {
    total: events.length,
    critical: events.filter((event) => event.severity === "critical").length,
    blocked: events.filter((event) => event.result === "blocked").length,
    failures: events.filter(
      (event) =>
        event.result === "failure" || event.action.includes("job.failed"),
    ).length,
    terminal: events.filter((event) => event.resourceType === "terminal")
      .length,
  };
  const displayedEvents = compact ? events.slice(0, 5) : visibleEvents;
  return (
    <Card className="min-w-0 max-w-full overflow-hidden border-slate-200 bg-white shadow-sm">
      <CardHeader className="min-w-0 p-4 pb-3 sm:p-5 sm:pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="truncate text-xl font-black">
              {compact ? "Recent audit" : "Audit"}
            </CardTitle>
            <CardDescription>
              {compact
                ? "Latest security and operations events."
                : "Review security, SSH access, jobs, and terminal activity."}
            </CardDescription>
          </div>
          {!compact ? (
            <Badge variant={summary.critical ? "destructive" : "secondary"}>
              {summary.critical} critical
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="min-w-0 max-w-full space-y-4 overflow-hidden p-4 pt-0 sm:p-5 sm:pt-0">
        {!compact ? (
          <>
            <section className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 xl:grid-cols-[minmax(0,1fr)_155px_145px_145px_165px_130px]">
              <Input
                aria-label="Search audit events"
                placeholder="Search events..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <select
                aria-label="Filter severity"
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
                value={severityFilter}
                onChange={(event) => setSeverityFilter(event.target.value)}
              >
                <option value="all">All severities</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
              <select
                aria-label="Filter status"
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
                <option value="blocked">Blocked</option>
              </select>
              <select
                aria-label="Filter actor"
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
                value={actorFilter}
                onChange={(event) => setActorFilter(event.target.value)}
              >
                <option value="all">All actors</option>
                {actors.map((actor) => (
                  <option key={actor} value={actor}>
                    {actor}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter server"
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
                value={serverFilter}
                onChange={(event) => setServerFilter(event.target.value)}
              >
                <option value="all">All servers</option>
                {servers.map((server) => (
                  <option key={server} value={server}>
                    {server}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter time range"
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
                defaultValue="24h"
              >
                <option value="24h">Last 24h</option>
                <option value="7d">Last 7d</option>
              </select>
            </section>
            <section className="flex flex-wrap gap-2">
              {[
                ["all", "All events"],
                ["critical", "Critical only"],
                ["failures", "Failures"],
                ["security", "SSH/security"],
                ["terminal", "Terminal sessions"],
              ].map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  variant={quickFilter === value ? "default" : "outline"}
                  size="sm"
                  className={`rounded-xl text-xs font-black ${quickFilter === value ? "bg-slate-950 text-white shadow-sm hover:bg-slate-800" : "bg-white"}`}
                  onClick={() => setQuickFilter(value)}
                >
                  {label}
                </Button>
              ))}
            </section>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <AuditSummary label="Total events" value={summary.total} />
              <AuditSummary
                label="Critical"
                value={summary.critical}
                tone="red"
              />
              <AuditSummary
                label="Failures"
                value={summary.failures}
                tone="amber"
              />
              <AuditSummary
                label="Blocked"
                value={summary.blocked}
                tone="red"
              />
              <AuditSummary
                label="Terminal sessions"
                value={summary.terminal}
              />
            </section>
          </>
        ) : null}
        {displayedEvents.length ? (
          <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200">
            <div className="hidden grid-cols-[1fr_1.55fr_0.8fr_1fr_0.8fr_0.8fr_1fr_0.8fr] gap-3 bg-slate-100 px-3 py-2 text-[12px] font-black uppercase tracking-[0.08em] text-slate-500 lg:grid">
              <span>Time</span>
              <span>Event</span>
              <span>Actor</span>
              <span>Server</span>
              <span>Severity</span>
              <span>Status</span>
              <span>Source/IP</span>
              <span>Action</span>
            </div>
            <div className="divide-y divide-slate-200">
              {displayedEvents.map((event, index) => {
                const target =
                  event.serverLabel ||
                  [event.resourceType, event.resourceId]
                    .filter(Boolean)
                    .join("/") ||
                  "dashboard";
                const severity =
                  event.severity ||
                  (event.result === "success" ? "info" : "warning");
                const isCritical = severity === "critical";
                const detail =
                  event.reason ||
                  event.jobId ||
                  event.requestId ||
                  event.authMethod ||
                  event.client;
                return (
                  <article
                    key={event.id}
                    className={`grid min-w-0 gap-2 border-l-4 px-3 py-4 text-sm font-semibold leading-6 text-slate-600 transition hover:bg-cyan-50/60 lg:grid-cols-[1fr_1.55fr_0.8fr_1fr_0.8fr_0.8fr_1fr_0.8fr] lg:items-center ${isCritical ? "border-l-red-500 bg-red-50/70" : index % 2 ? "border-l-transparent bg-slate-50/60" : "border-l-transparent bg-white"}`}
                  >
                    <span className="font-bold text-slate-600">
                      {formatDate(event.timestamp)}
                    </span>
                    <span className="flex min-w-0 items-start gap-2 text-slate-950">
                      <span
                        className={`mt-1 shrink-0 ${isCritical ? "text-red-600" : "text-slate-500"}`}
                      >
                        {isCritical ? (
                          <AlertTriangle size={16} />
                        ) : (
                          <Activity size={16} />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-black">
                          {event.actionLabel || event.action}
                        </span>
                        <span className="block truncate font-mono text-[11px] font-bold text-slate-400">
                          {event.actionLabel
                            ? event.eventCode || event.action
                            : ""}
                        </span>
                        {detail ? (
                          <span className="block truncate text-xs font-semibold text-slate-400">
                            {event.reason
                              ? `Reason: ${event.reason}`
                              : String(detail)}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span className="truncate">{event.actor || "system"}</span>
                    <span className="w-fit max-w-full truncate rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-black text-slate-600">
                      {target}
                    </span>
                    <Badge
                      className="w-fit uppercase"
                      variant={
                        severity === "warning"
                          ? "warning"
                          : severity === "critical"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {severity}
                    </Badge>
                    <Badge
                      className="w-fit uppercase"
                      variant={
                        event.result === "success" ? "ready" : "destructive"
                      }
                    >
                      {event.result}
                    </Badge>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-black text-slate-700">
                        {event.sourceIp || event.client || "n/a"}
                      </span>
                      {event.requestId ? (
                        <span className="block truncate font-mono text-[10px] text-slate-400">
                          {event.requestId}
                        </span>
                      ) : null}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`h-8 w-fit rounded-lg border-slate-300 bg-white px-2 text-xs font-black shadow-sm ${isCritical ? "border-red-300 text-red-700 hover:bg-red-50" : "text-slate-700"}`}
                      onClick={() => setSelectedEvent(event)}
                    >
                      Details
                    </Button>
                  </article>
                );
              })}
            </div>
          </div>
        ) : (
          <EmptyState>No audit events match these filters.</EmptyState>
        )}
        {selectedEvent ? (
          <AuditDetailsDrawer
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function AuditSummary({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "red" | "amber";
}) {
  const colors =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-white text-slate-900";
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${colors}`}>
      <p className="text-xs font-black uppercase tracking-[0.12em] opacity-70">
        {label}
      </p>
      <strong className="mt-1 block text-3xl font-black leading-none">
        {value}
      </strong>
    </div>
  );
}

function AuditDetailsDrawer({
  event,
  onClose,
}: {
  event: DashboardOverview["auditEvents"][number];
  onClose: () => void;
}) {
  const severity =
    event.severity || (event.result === "success" ? "info" : "warning");
  const target =
    event.serverLabel ||
    [event.resourceType, event.resourceId].filter(Boolean).join("/") ||
    "dashboard";
  const payload = JSON.stringify(event, null, 2);
  const copyText = (value: string) => navigator.clipboard?.writeText(value).catch(() => undefined);
  return (
    <Drawer
      open
      handleOnly
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      direction="right"
    >
      <DrawerContent showHandle={false} className="inset-y-0 bottom-auto left-auto right-0 mt-0 h-full w-full max-w-2xl select-text rounded-none border-l border-slate-200 bg-white shadow-2xl after:hidden">
        <DrawerHeader className="border-b border-slate-200 p-5 text-left">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Audit event details</p>
              <DrawerTitle className="mt-2 break-words text-2xl font-black text-slate-950">{event.actionLabel || event.action}</DrawerTitle>
              <DrawerDescription className="font-mono text-sm font-bold text-slate-500">{event.eventCode || event.action}</DrawerDescription>
            </div>
            <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0 border-slate-300 bg-white text-slate-800 shadow-sm" aria-label="Close audit details" onClick={onClose}><X size={16} /></Button>
          </div>
        </DrawerHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-5">
            <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <Button type="button" variant="outline" size="sm" className="rounded-lg bg-white text-xs font-black" onClick={() => copyText(payload)}><Copy size={14} />Copy payload</Button>
              {event.requestId ? <Button type="button" variant="outline" size="sm" className="rounded-lg bg-white text-xs font-black" onClick={() => copyText(event.requestId || "")}><Copy size={14} />Copy request ID</Button> : null}
              {event.serverLabel || event.resourceId ? <Button type="button" variant="outline" size="sm" className="rounded-lg bg-white text-xs font-black" disabled title="Coming soon">Open server</Button> : null}
              {event.jobId ? <Button type="button" variant="outline" size="sm" className="rounded-lg bg-white text-xs font-black" disabled title="Coming soon">View related job</Button> : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <AuditDetail label="Actor" value={event.actor || "system"} />
              <AuditDetail label="Server" value={target} />
              <AuditDetail label="Severity" value={severity} />
              <AuditDetail label="Status" value={event.result} />
              <AuditDetail label="Time" value={formatDate(event.timestamp)} />
              <AuditDetail
                label="Source/IP"
                value={event.sourceIp || event.client || "n/a"}
              />
              <AuditDetail
                label="Request ID"
                value={event.requestId || "n/a"}
              />
              <AuditDetail label="Related job" value={event.jobId || "n/a"} />
              <AuditDetail
                label="Auth method"
                value={event.authMethod || "n/a"}
              />
              <AuditDetail
                label="Duration"
                value={
                  event.durationMs
                    ? `${Math.round(event.durationMs / 1000)}s`
                    : "n/a"
                }
              />
            </div>
            {event.reason ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                <span className="block text-xs font-black uppercase tracking-[0.12em] text-red-500">
                  Reason
                </span>
                {event.reason}
              </div>
            ) : null}
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-950 p-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                Raw payload
              </p>
              <ScrollArea className="mt-3 h-96 rounded-lg">
                <pre className="whitespace-pre-wrap break-words pr-4 text-xs font-semibold leading-5 text-slate-100">
                  {payload}
                </pre>
              </ScrollArea>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}

function AuditDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}
export function TerminalPanel({
  terminal,
}: {
  terminal: DashboardOverview["terminal"];
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{terminal.label}</CardTitle>
        <CardDescription>
          Canned output only. No real SSH connections.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 font-black">
          <TerminalSquare size={18} />
          No real SSH connections
        </div>
        <p className="text-sm text-muted-foreground">
          Commands: {terminal.commands.join(", ") || "none"}
        </p>
        {terminal.sessions.map((session) => (
          <ScrollArea
            key={session.command}
            className="max-w-full rounded-md bg-primary"
          >
            <pre className="whitespace-pre-wrap break-words p-3 pr-4 text-sm text-primary-foreground">
              $ {session.command}
              {"\n"}
              {session.output}
            </pre>
          </ScrollArea>
        ))}
      </CardContent>
    </Card>
  );
}

export function SettingsPanel({ overview }: { overview: DashboardOverview }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>Read-only safety posture.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Badge variant="outline">APP_MODE={overview.settings.appMode}</Badge>
        <Badge variant="outline">
          web terminal{" "}
          {overview.settings.webTerminalEnabled ? "enabled" : "disabled"}
        </Badge>
        <Badge variant="outline">
          real SSH {overview.settings.realSshEnabled ? "enabled" : "disabled"}
        </Badge>
        <Badge variant="outline">
          local auth{" "}
          {overview.settings.authRequiredInLocalMode ? "required" : "off"}
        </Badge>
      </CardContent>
    </Card>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
