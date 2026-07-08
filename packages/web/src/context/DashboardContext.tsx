import {
  createContext,
  FormEvent,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { Alert } from "../components/ui/alert";
import {
  createVps,
  deleteVps,
  getDashboardOverview,
  listAuditEvents,
  listJobs,
  listMetrics,
  listVps,
  installAgent,
  logoutDashboard,
  provisionKey,
  updateVps,
  verifyKey,
  type DashboardMetric,
  type DashboardOverview,
  type VpsRecord,
} from "../lib/api";
import { subscribeMonitoring, type LiveConnectionState } from "../lib/live-api";

// ── Types ────────────────────────────────────────────────────────────

type StatusKind = "default" | "success" | "destructive";
type Status = { message: string; kind: StatusKind };

const initialCreateForm = {
  name: "",
  host: "",
  port: "22",
  username: "",
  password: "",
};

export type DashboardCtx = {
  records: VpsRecord[];
  visibleRecords: VpsRecord[];
  overview: DashboardOverview;
  statusAlert: ReactNode;
  serverSearch: string;
  statusFilter: string;
  busy: boolean;
  provisionPasswords: Record<string, string>;
  createForm: typeof initialCreateForm;
  metrics: DashboardOverview["metrics"];
  systemInfo: DashboardOverview["systemInfo"];
  dockerMetrics: DashboardOverview["dockerMetrics"];
  jobs: DashboardOverview["jobs"];
  auditEvents: DashboardOverview["auditEvents"];
  terminal: DashboardOverview["terminal"];
  settings: DashboardOverview["settings"];
  liveState: LiveConnectionState;
  mode: "demo" | "local";
  loaded: boolean;
  onLogout: (() => void) | undefined;
  onRefresh: () => void;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onCreateFormChange: (value: typeof initialCreateForm) => void;
  onCreate: (event: FormEvent<HTMLFormElement>) => void;
  onPasswordChange: (id: string, value: string) => void;
  onProvision: (vps: VpsRecord) => void;
  onVerify: (vps: VpsRecord) => void;
  onInstallAgent: (vps: VpsRecord) => void;
  onToggleDockerMetrics: (vps: VpsRecord) => void;
  onDelete: (vps: VpsRecord) => void;
};

// ── Context ──────────────────────────────────────────────────────────

export const DashboardContext = createContext<DashboardCtx | null>(null);

export function useDashboard(): DashboardCtx {
  const ctx = useContext(DashboardContext);
  if (!ctx)
    throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}

// ── Helpers ──────────────────────────────────────────────────────────

function mergeMetrics(
  existing: DashboardMetric[],
  updated: DashboardMetric[],
): DashboardMetric[] {
  const updatedMap = new Map(updated.map((m) => [m.vpsId, m]));
  const seen = new Set<string>();
  const merged = existing.map((m) => {
    const replacement = updatedMap.get(m.vpsId);
    if (replacement) {
      seen.add(m.vpsId);
      return replacement;
    }
    return m;
  });
  for (const m of updated) {
    if (!seen.has(m.vpsId)) {
      merged.push(m);
      seen.add(m.vpsId);
    }
  }
  return merged;
}

function isLocalHost(vps: VpsRecord): boolean {
  return vps.kind === "local" || vps.managedBy === "system";
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
  systemInfo: [],
  dockerMetrics: [],
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

// ── Provider ─────────────────────────────────────────────────────────

export function DashboardProvider({
  children,
  authRequired,
  onAfterLogout,
}: {
  children: ReactNode;
  authRequired: boolean;
  onAfterLogout?: () => void;
}) {
  const navigate = useNavigate();
  const [records, setRecords] = useState<VpsRecord[]>([]);
  const [overview, setOverview] = useState<DashboardOverview>(emptyOverview);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [provisionPasswords, setProvisionPasswords] = useState<
    Record<string, string>
  >({});
  const [serverSearch, setServerSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>({
    message: "Loading VPS list...",
    kind: "default",
  });
  const [liveState, setLiveState] = useState<LiveConnectionState>({
    status: "connecting",
  });
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // ── Data loading ───────────────────────────────────────────────────

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
      systemInfo: dashboard.systemInfo ?? [],
      dockerMetrics: dashboard.dockerMetrics ?? [],
      auditEvents,
      summary: {
        ...dashboard.summary,
        totalServers: servers.length,
        healthyServers: servers.filter((s) => s.status === "healthy").length,
        warningServers: servers.filter((s) => s.status === "warning").length,
        unreachableServers: servers.filter((s) => s.status === "unreachable")
          .length,
        runningJobs: jobs.filter((j) => j.status === "running").length,
      },
    });
    setRecords(servers);
    setStatus({ message, kind: "success" });
  }

  async function runAction<T>(
    loadingMessage: string,
    action: () => Promise<T>,
  ): Promise<T | undefined> {
    if (busy) return undefined;
    setBusy(true);
    setStatus({ message: loadingMessage, kind: "default" });
    try {
      const result = await action();
      await loadVps("Dashboard state synced.");
      return result;
    } catch (error) {
      setStatus({
        message: error instanceof Error ? error.message : "Request failed",
        kind: "destructive",
      });
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  // ── Initial data load on mount ─────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    loadVps()
      .then(() => {
        if (!cancelled) setInitialLoadDone(true);
      })
      .catch(() => {
        if (!cancelled) {
          setInitialLoadDone(true);
          setStatus({
            message: "Failed to load VPS data.",
            kind: "destructive",
          });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── SSE monitoring subscription ───────────────────────────────────

  useEffect(() => {
    const unsubscribe = subscribeMonitoring({
      onSnapshot: (payload) => {
        setOverview((prev) => ({
          ...prev,
          ...payload.overview,
          servers: payload.servers,
          jobs: payload.jobs,
          metrics: payload.metrics,
          systemInfo: payload.overview.systemInfo ?? [],
          dockerMetrics: payload.overview.dockerMetrics ?? [],
          auditEvents: payload.auditEvents,
        }));
        setRecords(payload.servers);
      },
      onMetricsUpdated: (payload) => {
        setOverview((prev) => {
          const updatedMetrics = mergeMetrics(prev.metrics, payload.metrics);
          const dockerMetrics =
            payload.dockerMetrics !== undefined
              ? payload.dockerMetrics
              : (prev.dockerMetrics ?? []);
          return {
            ...prev,
            metrics: updatedMetrics,
            dockerMetrics,
            systemInfo: payload.systemInfo ?? prev.systemInfo,
          };
        });
      },
      onHeartbeat: (_payload) => {},
      onError: (_payload) => {
        setLiveState({ status: "stale", latestEventAt: undefined });
      },
      onConnectionChange: (state: LiveConnectionState) => {
        setLiveState(state);
      },
    });

    unsubscribeRef.current = unsubscribe;
    return () => {
      unsubscribe();
      unsubscribeRef.current = null;
    };
  }, []);

  // ── Action handlers ────────────────────────────────────────────────

  async function handleLogout() {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    setLiveState({ status: "connecting" });
    try {
      await logoutDashboard();
    } finally {
      setRecords([]);
      setOverview(emptyOverview);
      setStatus({
        message: "Signed out. Enter the dashboard password to return.",
        kind: "default",
      });
    }
    onAfterLogout?.();
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

    const created = await runAction("Creating VPS...", async () => {
      const result = await createVps(payload);
      if (password) {
        setStatus({
          message: `Created ${result.name}. Installing SSH key...`,
          kind: "default",
        });
        await provisionKey(result.id, password);
        setStatus({
          message: `Created VPS and installed key for ${result.name}. Password was not stored.`,
          kind: "success",
        });
      } else {
        setStatus({
          message: `Created VPS ${result.name}. You can install the key from the list.`,
          kind: "success",
        });
      }
      setCreateForm(initialCreateForm);
      return result;
    });

    if (created) {
      navigate(`/vps/${encodeURIComponent(created.id)}`);
    }
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

  async function handleToggleDockerMetrics(vps: VpsRecord) {
    const nextEnabled = !vps.dockerMetricsEnabled;
    if (nextEnabled) {
      const confirmed = window.confirm(
        "Enable Docker metrics for this server? The agent will collect container names, images, status, and resource usage. It will not collect env vars, labels, mounts, logs, or commands.",
      );
      if (!confirmed) return;
    }

    await runAction(
      `${nextEnabled ? "Enabling" : "Disabling"} Docker metrics for ${vps.name}...`,
      async () => {
        await updateVps(vps.id, { dockerMetricsEnabled: nextEnabled });
        setStatus({
          message: `Docker metrics ${nextEnabled ? "enabled" : "disabled"} for ${vps.name}.`,
          kind: "success",
        });
      },
    );
  }

  async function handleDelete(vps: VpsRecord) {
    await runAction(`Deleting ${vps.name}...`, async () => {
      await deleteVps(vps.id);
      setStatus({ message: `Deleted ${vps.name}.`, kind: "success" });
    });
  }

  // ── Derived state ─────────────────────────────────────────────────

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
    const keyState =
      isLocalHost(vps) || vps.keyProvisionedAt ? "ready" : "pending";
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
      className="rounded-none px-3 py-2 text-sm font-normal"
    >
      {status.message}
    </Alert>
  );

  const mode = overview.mode;

  const ctx: DashboardCtx = {
    records,
    visibleRecords,
    overview,
    statusAlert,
    serverSearch,
    statusFilter,
    busy,
    provisionPasswords,
    createForm,
    metrics: overview.metrics,
    systemInfo: overview.systemInfo,
    dockerMetrics: overview.dockerMetrics,
    jobs: overview.jobs,
    auditEvents: overview.auditEvents,
    terminal: overview.terminal,
    settings: overview.settings,
    liveState,
    mode,
    loaded: initialLoadDone,
    onLogout: authRequired ? handleLogout : undefined,
    onRefresh: () => runAction("Refreshing VPS list...", () => loadVps()),
    onSearchChange: setServerSearch,
    onStatusFilterChange: setStatusFilter,
    onCreateFormChange: setCreateForm,
    onCreate: handleCreate,
    onPasswordChange: (id, value) =>
      setProvisionPasswords((current) => ({ ...current, [id]: value })),
    onProvision: handleProvision,
    onVerify: handleVerify,
    onInstallAgent: handleInstallAgent,
    onToggleDockerMetrics: handleToggleDockerMetrics,
    onDelete: handleDelete,
  };

  return (
    <DashboardContext.Provider value={ctx}>
      {children}
    </DashboardContext.Provider>
  );
}
