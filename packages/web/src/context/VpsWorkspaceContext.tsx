import { createContext, useContext, useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useParams } from "react-router-dom";
import {
  AuditPanel,
  JobsPanel,
  MetricsPanel,
  OverviewPanel,
  SettingsPanel,
  TerminalPanel,
} from "../components/dashboard/DashboardPanels";
import {
  listVpsAuditEvents,
  listVpsJobs,
  listVpsMetrics,
  type AuditEvent,
  type DashboardJob,
  type DashboardMetric,
  type DashboardOverview,
  type VpsRecord,
} from "../lib/api";
import { useDashboard } from "./DashboardContext";

// ── Context type ────────────────────────────────────────────────────

export type VpsWorkspaceCtx = {
  vps: VpsRecord;
  overview: DashboardOverview;
};

const VpsWorkspaceContext = createContext<VpsWorkspaceCtx | null>(null);

export function useVpsWorkspace(): VpsWorkspaceCtx {
  const ctx = useContext(VpsWorkspaceContext);
  if (!ctx)
    throw new Error("useVpsWorkspace must be used within VpsWorkspaceLayout");
  return ctx;
}

// ── Helper ──────────────────────────────────────────────────────────

/** Merge arrays by `id`, global (live) record overwrites bootstrap record. */
function mergeById<T extends { id: string }>(global: T[], bootstrap: T[]): T[] {
  if (bootstrap.length === 0) return global;
  if (global.length === 0) return bootstrap;
  const map = new Map<string, T>();
  for (const item of bootstrap) map.set(item.id, item);
  for (const item of global) map.set(item.id, item);
  return Array.from(map.values());
}

// ── Sub-page config ─────────────────────────────────────────────────

const workspaceSubPages = [
  { label: "Overview", to: "", end: true },
  { label: "Metrics", to: "metrics", end: false },
  { label: "Jobs", to: "jobs", end: false },
  { label: "Audit", to: "audit", end: false },
  { label: "Terminal", to: "terminal", end: false },
  { label: "Settings", to: "settings", end: false },
] as const;

// ── Layout ──────────────────────────────────────────────────────────

export function VpsWorkspaceLayout() {
  const { vpsId } = useParams<{ vpsId: string }>();
  const ctx = useDashboard();

  // ── Scoped REST bootstrap state ────────────────────────────────────
  const [scopedBootstrap, setScopedBootstrap] = useState<
    Record<
      string,
      {
        metrics: DashboardMetric[] | null;
        jobs: DashboardJob[] | null;
        audit: AuditEvent[] | null;
      }
    >
  >({});
  const hasBootstrappedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!vpsId || !ctx.loaded || hasBootstrappedRef.current.has(vpsId)) return;
    hasBootstrappedRef.current.add(vpsId);
    let cancelled = false;

    listVpsMetrics(vpsId)
      .then((data) => {
        if (!cancelled)
          setScopedBootstrap((prev) => ({
            ...prev,
            [vpsId]: { ...prev[vpsId], metrics: data },
          }));
      })
      .catch(() => {
        /* global data is fallback */
      });

    listVpsJobs(vpsId)
      .then((data) => {
        if (!cancelled)
          setScopedBootstrap((prev) => ({
            ...prev,
            [vpsId]: { ...prev[vpsId], jobs: data },
          }));
      })
      .catch(() => {
        /* global data is fallback */
      });

    listVpsAuditEvents(vpsId)
      .then((data) => {
        if (!cancelled)
          setScopedBootstrap((prev) => ({
            ...prev,
            [vpsId]: { ...prev[vpsId], audit: data },
          }));
      })
      .catch(() => {
        /* global data is fallback */
      });

    return () => {
      cancelled = true;
    };
  }, [vpsId, ctx.loaded]);

  useEffect(() => {
    return () => {
      hasBootstrappedRef.current = new Set();
    };
  }, []);

  // Loading state
  if (!ctx.loaded) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-sm font-normal text-white/50">
          Loading VPS workspace...
        </div>
      </div>
    );
  }

  // Not-found state
  const vps = ctx.records.find((record) => record.id === vpsId);
  if (!vps || !vpsId) {
    return <div className="p-6 text-white/50">VPS not found.</div>;
  }

  // ── Compute scoped view model ─────────────────────────────────────
  const globalMetrics = ctx.metrics.filter((metric) => metric.vpsId === vpsId);
  const globalJobs = ctx.jobs.filter((job) => job.vpsId === vpsId);

  const prefill = scopedBootstrap[vpsId];

  const metrics =
    globalMetrics.length > 0
      ? globalMetrics
      : (prefill?.metrics ?? globalMetrics);
  const jobs = prefill?.jobs ? mergeById(globalJobs, prefill.jobs) : globalJobs;

  const vpsJobIds = new Set(jobs.map((j) => j.id));
  const globalAudit = ctx.auditEvents.filter(
    (event) =>
      event.resourceId === vpsId ||
      (event.jobId != null && vpsJobIds.has(event.jobId)) ||
      (event.resourceId != null && vpsJobIds.has(event.resourceId)) ||
      event.serverLabel === vps.name,
  );
  const auditEvents = prefill?.audit
    ? mergeById(globalAudit, prefill.audit)
    : globalAudit;
  const systemInfo = ctx.systemInfo.filter((system) => system.vpsId === vpsId);
  const dockerMetrics = ctx.dockerMetrics.filter(
    (docker) => docker.vpsId === vpsId,
  );

  const overview: DashboardOverview = {
    ...ctx.overview,
    summary: {
      ...ctx.overview.summary,
      totalServers: 1,
      healthyServers: vps.status === "healthy" ? 1 : 0,
      warningServers: vps.status === "warning" ? 1 : 0,
      unreachableServers: vps.status === "unreachable" ? 1 : 0,
      runningJobs: jobs.filter((job) => job.status === "running").length,
    },
    servers: [vps],
    metrics,
    jobs,
    auditEvents,
    systemInfo,
    dockerMetrics,
  };

  const workspaceValue: VpsWorkspaceCtx = { vps, overview };

  return (
    <VpsWorkspaceContext.Provider value={workspaceValue}>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-normal text-white">{vps.name}</h2>
          <span className="text-sm text-white/50">{vps.host}</span>
        </div>

        <nav
          aria-label="VPS workspace sections"
          className="flex flex-wrap gap-0.5"
        >
          {workspaceSubPages.map((page) => (
            <NavLink
              key={page.to || "overview"}
              end={page.end}
              to={page.to || ""}
              className={({ isActive }) =>
                `inline-flex items-center px-4 py-2.5 text-xs font-normal uppercase tracking-[0.08em] transition ${
                  isActive
                    ? "border border-white/20 bg-white/[0.03] text-white shadow-none"
                    : "border border-transparent text-white/50 hover:border-white/10 hover:bg-white/[0.03] hover:text-white"
                }`
              }
            >
              {page.label}
            </NavLink>
          ))}
        </nav>

        <Outlet />
      </div>
    </VpsWorkspaceContext.Provider>
  );
}

// ── Child pages ─────────────────────────────────────────────────────

export function VpsWorkspaceOverviewPage() {
  const { overview } = useVpsWorkspace();
  return <OverviewPanel overview={overview} />;
}

export function VpsWorkspaceMetricsPage() {
  const { vps, overview } = useVpsWorkspace();
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-normal text-white">Metrics for {vps.name}</h2>
      <MetricsPanel metrics={overview.metrics} />
    </div>
  );
}

export function VpsWorkspaceJobsPage() {
  const { vps, overview } = useVpsWorkspace();
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-normal text-white">Jobs for {vps.name}</h2>
      <JobsPanel jobs={overview.jobs} />
    </div>
  );
}

export function VpsWorkspaceAuditPage() {
  const { vps, overview } = useVpsWorkspace();
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-normal text-white">Audit for {vps.name}</h2>
      <AuditPanel events={overview.auditEvents} />
    </div>
  );
}

export function VpsWorkspaceTerminalPage() {
  const { vps, overview } = useVpsWorkspace();
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-normal text-white">
        Terminal for {vps.name}
      </h2>
      <p className="text-sm text-white/50">
        Terminal configuration is still provided by the global dashboard until
        scoped terminal APIs are added.
      </p>
      <TerminalPanel terminal={overview.terminal} />
    </div>
  );
}

export function VpsWorkspaceSettingsPage() {
  const { vps, overview } = useVpsWorkspace();
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-normal text-white">
        Settings for {vps.name}
      </h2>
      <p className="text-sm text-white/50">
        Runtime settings are still global until scoped settings/actions are
        separated.
      </p>
      <SettingsPanel overview={overview} />
    </div>
  );
}
