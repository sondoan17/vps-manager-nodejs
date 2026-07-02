import { FormEvent, useEffect, useState, useRef } from "react";
import { Alert } from "./components/ui/alert";
import {
  DashboardShell,
  type DashboardView,
  type LiveConnectionState,
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
  installAgent,
  getAuthStatus,
  loginWithDashboardToken,
  logoutDashboard,
  provisionKey,
  verifyKey,
  type DashboardOverview,
  type VpsRecord,
  type DashboardMetric,
  type AuditEvent,
  type DashboardJob,
} from "./lib/api";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import {
  subscribeMonitoring,
  type LiveConnectionState as LiveState,
} from "./lib/live-api";

type StatusKind = "default" | "success" | "destructive";
type Status = { message: string; kind: StatusKind };
type AuthState =
  | { status: "checking" }
  | { status: "open"; mode: "demo" | "local"; authRequired: boolean }
  | { status: "locked"; mode: "demo" | "local"; message?: string };

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

/**
 * Merge incoming metrics.updated events into existing metrics,
 * replacing by vpsId and preserving order from the server list.
 */
function mergeMetrics(
  existing: DashboardMetric[],
  updated: DashboardMetric[],
): DashboardMetric[] {
  const updatedMap = new Map(updated.map((m) => [m.vpsId, m]));
  // Preserve order of existing metrics, replace values by vpsId
  const seen = new Set<string>();
  const merged = existing.map((m) => {
    const replacement = updatedMap.get(m.vpsId);
    if (replacement) {
      seen.add(m.vpsId);
      return replacement;
    }
    return m;
  });
  // Append any new metric entries not already present
  for (const m of updated) {
    if (!seen.has(m.vpsId)) {
      merged.push(m);
      seen.add(m.vpsId);
    }
  }
  return merged;
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
    label: "Terminal",
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
  const [authState, setAuthState] = useState<AuthState>({ status: "checking" });
  const [loginToken, setLoginToken] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [liveState, setLiveState] = useState<LiveState>({ status: "connecting" });
  const unsubscribeRef = useRef<(() => void) | null>(null);

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
    let cancelled = false;
    getAuthStatus()
      .then(async (auth) => {
        if (cancelled) return;
        if (!auth.authRequired || auth.authenticated) {
          setAuthState({ status: "open", mode: auth.mode, authRequired: auth.authRequired });
          await loadVps();
          return;
        }
        setAuthState({ status: "locked", mode: auth.mode });
        setStatus({ message: "Dashboard token required.", kind: "default" });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setAuthState({
          status: "locked",
          mode: "local",
          message: error instanceof Error ? error.message : "Unable to verify dashboard access.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── SSE monitoring subscription ─────────────────────────────────

  useEffect(() => {
    if (authState.status !== "open") return;
    const unsubscribe = subscribeMonitoring({
      onSnapshot: (payload) => {
        setOverview((prev) => ({
          ...prev,
          ...payload.overview,
          servers: payload.servers,
          jobs: payload.jobs,
          metrics: payload.metrics,
          auditEvents: payload.auditEvents,
        }));
        setRecords(payload.servers);
      },
      onMetricsUpdated: (payload) => {
        setOverview((prev) => {
          const updatedMetrics = mergeMetrics(prev.metrics, payload.metrics);
          return { ...prev, metrics: updatedMetrics };
        });
      },
      onHeartbeat: (_payload) => {
        // Heartbeat updates the live timestamp (handled in onConnectionChange)
      },
      onError: (_payload) => {
        setLiveState({ status: "stale", latestEventAt: undefined });
      },
      onConnectionChange: (state: LiveState) => {
        setLiveState(state);
      },
    });

    unsubscribeRef.current = unsubscribe;
    return () => {
      unsubscribe();
      unsubscribeRef.current = null;
    };
  }, [authState.status]);

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

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = loginToken.trim();
    if (!token) {
      setAuthState({ status: "locked", mode: "local", message: "Enter the dashboard token to continue." });
      return;
    }
    setLoginBusy(true);
    try {
      const auth = await loginWithDashboardToken(token);
      setLoginToken("");
      setAuthState({ status: "open", mode: auth.mode, authRequired: auth.authRequired });
      await loadVps("Access verified. Dashboard loaded.");
    } catch (error) {
      setAuthState({
        status: "locked",
        mode: "local",
        message: error instanceof Error ? error.message : "Login failed. Check the token and try again.",
      });
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleLogout() {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    setLiveState({ status: "connecting" });
    try {
      await logoutDashboard();
    } finally {
      setRecords([]);
      setOverview(emptyOverview);
      setAuthState({ status: "locked", mode: "local" });
      setStatus({ message: "Signed out. Enter the dashboard token to return.", kind: "default" });
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

  async function handleProvision(vps: VpsRecord) {
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

  async function handleInstallAgent(vps: VpsRecord) {
    const password = provisionPasswords[vps.id] || "";
    await runAction(`Starting agent install for ${vps.name}...`, async () => {
      const result = await installAgent(vps.id, password || undefined);
      if (password) {
        setProvisionPasswords((current) => ({ ...current, [vps.id]: "" }));
      }
      setStatus({
        message: `Agent install queued for ${vps.name}. Job ${result.jobId} is running in the background.`,
        kind: "success",
      });
    });
  }

  async function handleDelete(vps: VpsRecord) {
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

  if (authState.status === "checking") return <AuthLoadingScreen />;
  if (authState.status === "locked") {
    return (
      <LoginGate
        token={loginToken}
        busy={loginBusy}
        message={authState.message}
        onTokenChange={setLoginToken}
        onSubmit={handleLogin}
      />
    );
  }

  return (
    <DashboardShell
      activeView={activeView}
      onViewChange={handleViewChange}
      mode={overview.mode}
      busy={busy}
      liveState={liveState}
      onRefresh={() => runAction("Refreshing VPS list...", () => loadVps())}
      onLogout={authState.authRequired ? handleLogout : undefined}
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
          onInstallAgent={handleInstallAgent}
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

function AuthLoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 text-white">
      <div className="rounded-3xl border border-white/10 bg-white/10 px-6 py-5 font-semibold shadow-2xl backdrop-blur">
        Checking dashboard access...
      </div>
    </main>
  );
}

function LoginGate({ token, busy, message, onTokenChange, onSubmit }: { token: string; busy: boolean; message?: string; onTokenChange: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <main className="relative grid min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-cyan-950 px-4 py-8 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(34,211,238,0.24),transparent_26%),radial-gradient(circle_at_90%_4%,rgba(99,102,241,0.32),transparent_28%)]" />
      <section className="relative m-auto w-full max-w-md rounded-[2rem] border border-white/12 bg-white/10 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200/80">Secure local console</p>
          <h1 className="mt-2 font-display text-3xl leading-tight">Unlock VPS Ops</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-white/70">Enter the dashboard token configured on this server. The token is sent once to create an HttpOnly session and is not stored in browser storage.</p>
        </div>
        <form className="grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="dashboard-token" className="text-white">Dashboard token</Label>
            <Input id="dashboard-token" type="password" autoComplete="current-password" value={token} onChange={(event) => onTokenChange(event.target.value)} className="h-12 border-white/15 bg-slate-950/55 text-white placeholder:text-white/40" placeholder="Paste token" autoFocus />
          </div>
          {message ? <Alert variant="destructive" className="rounded-xl px-3 py-2 text-sm font-semibold">{message}</Alert> : null}
          <Button type="submit" disabled={busy} className="h-12 rounded-xl bg-cyan-300 font-black text-slate-950 hover:bg-cyan-200">
            {busy ? "Verifying..." : "Enter dashboard"}
          </Button>
        </form>
      </section>
    </main>
  );
}
