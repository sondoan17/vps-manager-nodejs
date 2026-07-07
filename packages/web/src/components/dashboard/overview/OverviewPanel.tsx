import { type LucideIcon } from "lucide-react";
import {
  Activity,
  Cpu,
  HardDrive,
  KeyRound,
  MemoryStick,
  Network,
  Server,
} from "lucide-react";
import { Alert } from "../../ui/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import type { DashboardOverview } from "../../../lib/api";
import { formatBytes } from "../shared/formatBytes";
import { AuditPanel } from "../audit/AuditPanel";
import { JobsPanel } from "../jobs/JobsPanel";

export function DemoBanner({ overview }: { overview: DashboardOverview }) {
  if (!overview.banner) return null;
  return (
    <Alert className="mb-4 rounded-md border-0 bg-white/75 text-primary shadow-sm ring-1 ring-primary/10">
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
    <div className="min-w-0 space-y-5 overflow-visible">
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
      "border-white/10 bg-[#000000] text-white before:bg-[#ffffff] text-neutral-100",
    work: "border-white/10 bg-[#000000] text-white before:bg-[#a3a3a3] text-neutral-100",
    load: "border-white/10 bg-[#000000] text-white before:bg-[#000000] text-neutral-100",
  };
  return (
    <article
      className={`${tones[tone]} before:absolute before:inset-x-0 before:top-0 before:h-1 relative min-h-28 min-w-0 overflow-hidden rounded-md border p-4 pt-5 shadow-panel transition duration-300 hover:-translate-y-0.5 sm:min-h-32`}
    >
      <div className="absolute -right-10 -top-12 h-24 w-24 rounded-full bg-current/10 blur-2xl" />
      <div className="relative flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-black uppercase tracking-[0.2em] text-white/45">
            {label}
          </p>
          <h2 className="mt-2 truncate font-display text-2xl font-bold tracking-[-0.04em] text-white sm:text-[1.8rem]">
            {title}
          </h2>
          <p className="mt-1 truncate text-[14px] font-semibold leading-6 text-white/58">
            {detail}
          </p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-white/10 bg-white/10 text-current">
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
      className={`min-w-0 overflow-hidden rounded-md border-neutral-200/80 bg-white/95 shadow-panel backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(13,14,18,0.08)] ${isHot ? "ring-2 ring-neutral-200" : ""}`}
    >
      <CardContent className="p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-black uppercase tracking-[0.14em] text-neutral-500">
              {label}
            </p>
            <strong className="mt-1 block truncate text-2xl font-black text-neutral-950">
              {value}
            </strong>
            <p className="mt-1 truncate text-[15px] font-semibold leading-6 text-neutral-500">
              {detail}
            </p>
          </div>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-neutral-200 bg-neutral-50 text-neutral-700 shadow-sm">
            <Icon size={18} />
          </span>
        </div>
        {trend ? (
          <>
            <div className="mt-3 flex items-center justify-between gap-2 text-xs font-black uppercase tracking-[0.08em] text-neutral-500">
              <span>Last {range}</span>
              <span className={isHot ? "text-neutral-600" : "text-neutral-500"}>
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
            <div className="mt-1 flex items-center justify-between text-sm font-bold leading-6 text-neutral-500">
              <span>min {min}%</span>
              <span>max {max}%</span>
            </div>
          </>
        ) : (
          <div className="mt-3 rounded-sm border border-dashed border-neutral-200 bg-neutral-50 px-3 py-4 text-sm font-bold text-neutral-400">
            No backend trend data
          </div>
        )}
      </CardContent>
    </Card>
  );
}
