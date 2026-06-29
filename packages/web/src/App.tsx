import { FormEvent, useEffect, useState } from "react";
import { Alert } from "./components/ui/alert";
import {
  DashboardShell,
  type DashboardView,
} from "./components/layout/DashboardShell";
import {
  AuditPanel,
  JobsPanel,
  MetricsPanel,
  OverviewPanel,
  ServersPanel,
  SettingsPanel,
  TerminalPanel,
} from "./components/dashboard/DashboardPanels";
import {
  createVps,
  deleteVps,
  getDashboardOverview,
  listAuditEvents,
  listJobs,
  listMetrics,
  listVps,
  provisionKey,
  verifyKey,
  type DashboardOverview,
  type VpsRecord,
} from "./lib/api";

type StatusKind = "default" | "success" | "destructive";
type Status = { message: string; kind: StatusKind };

const initialCreateForm = {
  name: "",
  host: "",
  port: "22",
  username: "",
  password: "",
};

const routeByView = {
  overview: "/overview",
  servers: "/servers",
  jobs: "/jobs",
  metrics: "/metrics",
  audit: "/audit",
  terminal: "/terminal",
  settings: "/settings",
} satisfies Record<DashboardView, string>;

const viewByRoute = Object.fromEntries(
  Object.entries(routeByView).map(([view, route]) => [route, view]),
) as Record<string, DashboardView>;

function getViewFromPathname(pathname: string): DashboardView {
  if (pathname === "/") return "overview";
  return viewByRoute[pathname] || "overview";
}

const emptyOverview: DashboardOverview = {
  mode: "local",
  summary: {
    totalServers: 0,
    healthyServers: 0,
    warningServers: 0,
    unreachableServers: 0,
    runningJobs: 0,
  },
  servers: [],
  metrics: [],
  jobs: [],
  auditEvents: [],
  terminal: {
    label: "Demo terminal",
    networkAccess: "disabled",
    commands: [],
    sessions: [],
  },
  settings: {
    appMode: "local",
    webTerminalEnabled: false,
    realSshEnabled: false,
    authRequiredInLocalMode: true,
  },
};

export function App() {
  const [records, setRecords] = useState<VpsRecord[]>([]);
  const [overview, setOverview] = useState<DashboardOverview>(emptyOverview);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [provisionPasswords, setProvisionPasswords] = useState<
    Record<string, string>
  >({});
  const [serverSearch, setServerSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeView, setActiveView] = useState<DashboardView>(() =>
    getViewFromPathname(window.location.pathname),
  );
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>({
    message: "Loading VPS list...",
    kind: "default",
  });

  async function loadVps(message = "VPS list refreshed.") {
    const [dashboard, servers, jobs, metrics, auditEvents] = await Promise.all([
      getDashboardOverview(),
      listVps(),
      listJobs(),
      listMetrics(),
      listAuditEvents(),
    ]);
    setOverview({
      ...dashboard,
      servers,
      jobs,
      metrics,
      auditEvents,
      summary: {
        ...dashboard.summary,
        totalServers: servers.length,
        healthyServers: servers.filter((server) => server.status === "healthy")
          .length,
        warningServers: servers.filter((server) => server.status === "warning")
          .length,
        unreachableServers: servers.filter(
          (server) => server.status === "unreachable",
        ).length,
        runningJobs: jobs.filter((job) => job.status === "running").length,
      },
    });
    setRecords(servers);
    setStatus({ message, kind: "success" });
  }

  async function runAction(
    loadingMessage: string,
    action: () => Promise<void>,
  ) {
    if (busy) return;
    setBusy(true);
    setStatus({ message: loadingMessage, kind: "default" });
    try {
      await action();
      await loadVps("Dashboard state synced.");
    } catch (error) {
      setStatus({
        message: error instanceof Error ? error.message : "Request failed",
        kind: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadVps().catch((error: unknown) =>
      setStatus({
        message: error instanceof Error ? error.message : "Request failed",
        kind: "destructive",
      }),
    );
  }, []);

  useEffect(() => {
    function handlePopState() {
      setActiveView(getViewFromPathname(window.location.pathname));
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function handleViewChange(view: DashboardView) {
    setActiveView(view);
    const route = routeByView[view];
    if (window.location.pathname !== route) {
      window.history.pushState({}, "", route);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = createForm.password;
    const payload = {
      name: createForm.name.trim(),
      host: createForm.host.trim(),
      port: Number(createForm.port || 22),
      username: createForm.username.trim(),
    };

    await runAction("Creating VPS...", async () => {
      const created = await createVps(payload);
      if (password) {
        setStatus({
          message: `Created ${created.name}. Installing SSH key...`,
          kind: "default",
        });
        await provisionKey(created.id, password);
        setStatus({
          message: `Created VPS and installed key for ${created.name}. Password was not stored.`,
          kind: "success",
        });
      } else {
        setStatus({
          message: `Created VPS ${created.name}. You can install the key from the list.`,
          kind: "success",
        });
      }
      setCreateForm(initialCreateForm);
    });
  }

  async function handleProvision(
    vps: VpsRecord,
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    const password = provisionPasswords[vps.id] || "";
    if (!password) {
      setStatus({
        message: "Enter the one-time password to install the SSH key.",
        kind: "destructive",
      });
      return;
    }

    await runAction(`Installing key for ${vps.name}...`, async () => {
      await provisionKey(vps.id, password);
      setProvisionPasswords((current) => ({ ...current, [vps.id]: "" }));
      setStatus({
        message: `Installed SSH key for ${vps.name}. Password was not stored.`,
        kind: "success",
      });
    });
  }

  async function handleVerify(vps: VpsRecord) {
    await runAction(`Verifying key for ${vps.name}...`, async () => {
      await verifyKey(vps.id);
      setStatus({ message: `Key verified for ${vps.name}.`, kind: "success" });
    });
  }

  async function handleDelete(vps: VpsRecord) {
    if (!window.confirm(`Delete ${vps.name}? This cannot be undone.`)) return;
    await runAction(`Deleting ${vps.name}...`, async () => {
      await deleteVps(vps.id);
      setStatus({ message: `Deleted ${vps.name}.`, kind: "success" });
    });
  }

  const visibleRecords = records.filter((vps) => {
    const haystack = [
      vps.name,
      vps.host,
      vps.username,
      vps.provider,
      vps.region,
      vps.notes,
      ...(vps.tags || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesSearch = haystack.includes(serverSearch.trim().toLowerCase());
    const keyState = vps.keyProvisionedAt ? "ready" : "pending";
    return (
      matchesSearch &&
      (statusFilter === "all" ||
        vps.status === statusFilter ||
        keyState === statusFilter)
    );
  });

  const statusAlert = (
    <Alert
      variant={status.kind}
      className="rounded-xl px-3 py-2 text-sm font-semibold"
    >
      {status.message}
    </Alert>
  );

  return (
    <DashboardShell
      activeView={activeView}
      onViewChange={handleViewChange}
      mode={overview.mode}
      busy={busy}
      onRefresh={() => runAction("Refreshing VPS list...", () => loadVps())}
    >
      {activeView === "overview" ? <OverviewPanel overview={overview} /> : null}
      {activeView === "servers" ? (
        <ServersPanel
          records={records}
          visibleRecords={visibleRecords}
          statusMessage={statusAlert}
          serverSearch={serverSearch}
          statusFilter={statusFilter}
          busy={busy}
          provisionPasswords={provisionPasswords}
          createForm={createForm}
          metrics={overview.metrics}
          jobs={overview.jobs}
          onSearchChange={setServerSearch}
          onStatusFilterChange={setStatusFilter}
          onCreateFormChange={setCreateForm}
          onCreate={handleCreate}
          onPasswordChange={(id, value) =>
            setProvisionPasswords((current) => ({ ...current, [id]: value }))
          }
          onProvision={handleProvision}
          onVerify={handleVerify}
          onDelete={handleDelete}
        />
      ) : null}
      {activeView === "jobs" ? <JobsPanel jobs={overview.jobs} /> : null}
      {activeView === "metrics" ? (
        <MetricsPanel metrics={overview.metrics} />
      ) : null}
      {activeView === "audit" ? (
        <AuditPanel events={overview.auditEvents} />
      ) : null}
      {activeView === "terminal" ? (
        <TerminalPanel terminal={overview.terminal} />
      ) : null}
      {activeView === "settings" ? <SettingsPanel overview={overview} /> : null}
    </DashboardShell>
  );
}
