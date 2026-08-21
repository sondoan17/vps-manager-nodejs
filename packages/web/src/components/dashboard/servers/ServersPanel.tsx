import { LayoutGrid, List, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader } from "../../ui/card";
import { Input } from "../../ui/input";
import { EmptyState } from "../shared/EmptyState";
import { ServerCard } from "./ServerCard";
import { ServerTable } from "./ServerTable";
import { ServerOpsSummary } from "./ServerOpsSummary";
import type { ServersPanelProps, ViewMode } from "./types";

export { type ServersPanelProps, type ViewMode };

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
    <div className="grid min-w-0 max-w-full gap-5">
      <Card className="min-w-0 overflow-hidden border-0 bg-white/[0.03] shadow-none">
        <CardHeader className="min-w-0 border-b border-white/10 bg-white/[0.03] px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <p className="truncate text-[11px] font-normal uppercase tracking-[0.2em] text-[#ffffff]">
              Fleet inventory
            </p>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Button
                asChild
                className="min-w-0 rounded-none"
              >
                <Link to="/vps/new">
                  <Plus size={16} />
                  <span className="truncate">New VPS</span>
                </Link>
              </Button>
              <div className="flex shrink-0 items-center gap-1 rounded-none border border-white/10 bg-white/[0.03] p-0.5 shadow-none">
                <button
                  type="button"
                  aria-label="Card view"
                  className={`grid h-8 w-8 place-items-center rounded-none text-sm transition ${
                    props.viewMode === "card"
                      ? "bg-white/[0.03] text-[#ffffff]"
                      : "text-white/50 hover:text-white/70"
                  }`}
                  onClick={() => props.onViewModeChange("card")}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Table view"
                  className={`grid h-8 w-8 place-items-center rounded-none text-sm transition ${
                    props.viewMode === "table"
                      ? "bg-white/[0.03] text-[#ffffff]"
                      : "text-white/50 hover:text-white/70"
                  }`}
                  onClick={() => props.onViewModeChange("table")}
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>
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
              className="h-10 min-w-0 w-full rounded-none border-0 bg-white/[0.03] shadow-none px-3 text-sm font-normal text-white/70 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/20"
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
              <p>No VPS servers yet. Add your first server to get started.</p>
              <Button
                asChild
                variant="outline"
                className="mt-3"
              >
                <Link to="/vps/new">
                  <Plus size={16} />
                  New VPS
                </Link>
              </Button>
            </EmptyState>
          ) : props.visibleRecords.length === 0 ? (
            <EmptyState>No servers match this filter.</EmptyState>
          ) : props.viewMode === "table" ? (
            <ServerTable
              vpsList={props.visibleRecords}
              busy={props.busy}
              provisionPasswords={props.provisionPasswords}
              onVerify={props.onVerify}
              onInstallAgent={props.onInstallAgent}
              onDelete={props.onDelete}
            />
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
    </div>
  );
}
