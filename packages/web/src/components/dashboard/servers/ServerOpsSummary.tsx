import type { DashboardOverview, VpsRecord } from "../../../lib/api";
import { SummaryPill } from "../shared/SummaryPill";

export function ServerOpsSummary({
  records,
  metrics,
}: {
  records: VpsRecord[];
  metrics: DashboardOverview["metrics"];
}) {
  const ready = records.filter(
    (server) =>
      server.kind === "local" ||
      server.managedBy === "system" ||
      server.keyProvisionedAt,
  ).length;
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
      className="grid grid-cols-1 gap-3 border-t border-white/10 pt-4 sm:grid-cols-2 xl:grid-cols-4"
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
