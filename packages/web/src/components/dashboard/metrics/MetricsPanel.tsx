import { useState } from "react";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import {
  chipVariant,
  freshnessLabel,
} from "../../../lib/dashboard-formatters";
import type { DashboardOverview } from "../../../lib/api";
import { formatBytes } from "../shared/formatBytes";
import { formatUptime } from "../shared/formatUptime";
import { EmptyState } from "../shared/EmptyState";

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
    <Card className="min-w-0 overflow-hidden border-white/10 bg-white/[0.03] shadow-none">
      <CardHeader className="p-4 pb-3 sm:p-5 sm:pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl font-normal">Metrics</CardTitle>
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
          className="grid gap-3 rounded-none border-0 bg-white/[0.03] shadow-none p-3 md:grid-cols-[minmax(0,1fr)_190px]"
          aria-label="Metrics filters"
        >
          <select
            aria-label="Filter metrics server"
            className="h-10 rounded-none border-0 bg-white/[0.03] shadow-none px-3 text-sm font-normal text-white/70 outline-none focus:ring-4 focus:ring-ring"
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
            className="h-10 rounded-none border-0 bg-white/[0.03] shadow-none px-3 text-sm font-normal text-white/70 outline-none focus:ring-4 focus:ring-ring"
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
          className="grid gap-3 rounded-none border-0 bg-white/[0.03] shadow-none p-3 md:grid-cols-2 xl:grid-cols-4"
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
          className="rounded-none border-0 bg-white/[0.03] shadow-none p-4"
          aria-label="Recent metric alerts"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-normal text-[#ffffff]">Recent metric alerts</h3>
            <Badge variant={alerts.length ? "pending" : "ready"}>
              {alerts.length} alerts
            </Badge>
          </div>
          {alerts.length ? (
            <div className="mt-3 overflow-hidden rounded-none border border-white/10">
              <div className="hidden grid-cols-[0.8fr_1fr_minmax(0,1.5fr)_0.8fr_auto] gap-3 bg-white/[0.03] px-3 py-2 text-[11px] font-normal uppercase tracking-[0.08em] text-white/50 md:grid">
                <span>Severity</span>
                <span>Server</span>
                <span>Message</span>
                <span>Last check</span>
                <span>Action</span>
              </div>
              <div className="divide-y divide-neutral-200">
                {alerts.map((alert) => (
                  <article
                    key={`${alert.vpsId}-${alert.message}`}
                    className="grid gap-2 px-3 py-2 text-sm font-normal text-white/50 md:grid-cols-[0.8fr_1fr_minmax(0,1.5fr)_0.8fr_auto] md:items-center"
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
                      className="truncate font-normal text-white/70"
                      title={alert.vpsId}
                    >
                      {alert.vpsId}
                    </span>
                    <span className="min-w-0 text-white/50">
                      {alert.message}
                    </span>
                    <span className="text-xs font-normal text-white/50">
                      {alert.time}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-fit rounded-none text-xs font-normal"
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
            <p className="mt-3 text-sm font-normal text-white/50">
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
      className={`min-w-0 rounded-none border px-3.5 py-3 shadow-none ${tone === "red" ? "border-white/10 bg-white/[0.03] text-white/70" : "border-white/10 bg-white/[0.03] text-white/70"}`}
    >
      <p className="text-[11px] font-normal uppercase tracking-[0.12em] opacity-75">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-normal opacity-70" title={server}>
        {server}
      </p>
      <p className="mt-1 text-2xl font-normal leading-none">{value}</p>
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
      className={`grid min-w-0 gap-3 rounded-none border p-4 shadow-none xl:grid-cols-[minmax(220px,1fr)_minmax(360px,1.4fr)_auto] xl:items-center ${stale ? "border-white/10 bg-white/[0.03]/60 ring-1 ring-white/10" : "border-white/10 bg-white/[0.03]"}`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="truncate text-lg font-normal text-[#ffffff]">
            {metric.vpsId}
          </strong>
          <Badge className="uppercase" variant={chipVariant(metric.freshness)}>
            {metric.freshness}
          </Badge>
        </div>
        <p className="mt-1 text-sm font-normal text-white/50">
          Collected {freshnessLabel(metric.collectedAt)} · Uptime{" "}
          {formatUptime(metric.uptime)}
        </p>
        {warnings.length ? (
          <p className="mt-2 text-xs font-normal uppercase tracking-[0.08em] text-white/70">
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
          className="rounded-none text-xs font-normal"
          disabled
          title="Coming soon"
        >
          View details
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-none text-xs font-normal"
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
      className={`min-w-0 rounded-none border px-3 py-2 ${hot ? "border-white/10 bg-white/[0.03] text-[#ffffff]" : "border-white/10 bg-white/[0.03] text-white/70"}`}
    >
      <p className="text-[10px] font-normal uppercase tracking-[0.1em] opacity-70">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-normal" title={value}>
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
      <div className="rounded-none border border-dashed border-white/10 bg-white/[0.03] p-3 text-sm font-normal text-white/30">
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
    <div className="rounded-none border-0 bg-white/[0.03] shadow-none p-3 shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-normal uppercase tracking-[0.1em] text-white/50">
            {label}
          </p>
          <p className="mt-1 text-sm font-normal text-white/50">
            {metric.vpsId} · {metric.trend.range}
          </p>
        </div>
        <div className="text-right text-xs font-normal text-white/50">
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
          stroke="#1f2228"
          strokeDasharray="4 4"
          strokeWidth="1.5"
        />
        <polyline
          points={polyline}
          fill="none"
          stroke="#1f2228"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line x1="0" x2="100" y1="50" y2="50" stroke="#e5e5e5" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] font-normal uppercase tracking-[0.08em] text-white/30">
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
