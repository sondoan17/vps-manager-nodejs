import type { DashboardOverview, VpsRecord } from "../../../lib/api";
import { vpsDisplayName } from "../../../lib/dashboard-formatters";
import { SummaryPill } from "../shared/SummaryPill";

type Tone = "default" | "amber" | "red";

export function calculateServerOpsSummary(
  records: VpsRecord[],
  metrics: DashboardOverview["metrics"],
  dockerMetrics: DashboardOverview["dockerMetrics"],
) {
  const attention = records.filter((server) => {
    const local = server.kind === "local" || server.managedBy === "system";
    const hostProblem = server.status !== "healthy";
    const agentProblem = !local && server.agentStatus !== "online";
    const accessProblem = !local && !server.keyProvisionedAt;
    return hostProblem || agentProblem || accessProblem;
  }).length;

  const names = new Map(records.map((server) => [server.id, vpsDisplayName(server)]));
  const pressureCandidates = metrics.flatMap((metric) =>
    (["CPU", "Memory", "Disk"] as const).map((resource) => ({
      server: names.get(metric.vpsId) ?? metric.vpsId,
      resource,
      percent: resource === "CPU" ? metric.cpu : resource === "Memory" ? metric.memory : metric.disk,
    })),
  ).filter((item) => Number.isFinite(item.percent) && item.percent >= 0);
  const pressure = pressureCandidates.sort((a, b) => b.percent - a.percent)[0] ?? null;

  const availableDocker = dockerMetrics.filter((metric) => metric.available);
  const containers = availableDocker.reduce((summary, metric) => {
    const unhealthy = metric.containers.filter((container) =>
      /unhealthy|health:\s*starting|restarting|dead|exited/i.test(`${container.state} ${container.status ?? ""}`),
    ).length;
    summary.running += metric.containerRunning;
    summary.problems += Math.max(0, metric.containerTotal - metric.containerRunning) +
      metric.containers.filter((container) => container.state.toLowerCase() === "running").filter((container) =>
        /unhealthy|health:\s*starting|restarting/i.test(container.status ?? ""),
      ).length;
    summary.unhealthy += unhealthy;
    return summary;
  }, { running: 0, problems: 0, unhealthy: 0 });

  const liveAgents = records.filter((server) =>
    server.kind === "local" || server.managedBy === "system" || server.agentStatus === "online",
  ).length;
  const agentGaps = records.length - liveAgents;

  return { attention, pressure, containers, liveAgents, agentGaps, dockerAvailable: availableDocker.length };
}

export function ServerOpsSummary({ records, metrics, dockerMetrics }: {
  records: VpsRecord[];
  metrics: DashboardOverview["metrics"];
  dockerMetrics: DashboardOverview["dockerMetrics"];
}) {
  const summary = calculateServerOpsSummary(records, metrics, dockerMetrics);
  const attentionTone: Tone = summary.attention === 0 ? "default" : records.some((server) => server.status === "unreachable" || server.agentStatus === "failed") ? "red" : "amber";
  const containerTone: Tone = summary.containers.problems ? (summary.containers.unhealthy ? "red" : "amber") : "default";
  const monitoringTone: Tone = summary.agentGaps ? (summary.liveAgents === 0 ? "red" : "amber") : "default";

  return (
    <section className="grid grid-cols-1 gap-3 border-t border-white/10 pt-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Fleet health summary">
      <SummaryPill label={summary.attention ? "Needs attention" : "Fleet health"} value={summary.attention ? `${summary.attention} server${summary.attention === 1 ? "" : "s"}` : `${records.length} healthy`} tone={attentionTone} />
      <SummaryPill label="Resource pressure" value={summary.pressure ? `${summary.pressure.server} · ${summary.pressure.resource} ${summary.pressure.percent.toFixed(0)}%` : "No metrics available"} tone={summary.pressure && summary.pressure.percent >= 90 ? "red" : summary.pressure && summary.pressure.percent >= 75 ? "amber" : "default"} />
      <SummaryPill label="Containers" value={summary.dockerAvailable === 0 ? "No Docker metrics" : summary.containers.problems ? `${summary.containers.problems} problem · ${summary.containers.running} running` : `${summary.containers.running} running · All healthy`} tone={containerTone} />
      <SummaryPill label="Monitoring" value={`${summary.liveAgents}/${records.length} agents live${summary.agentGaps ? ` · ${summary.agentGaps} missing` : ""}`} tone={monitoringTone} />
    </section>
  );
}
