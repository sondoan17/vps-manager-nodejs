import { FormEvent, useEffect, useState } from "react";
import { Alert } from "./components/ui/alert";
import { DashboardShell, type DashboardView } from "./components/layout/DashboardShell";
import { AuditPanel, JobsPanel, MetricsPanel, OverviewPanel, ServersPanel, SettingsPanel, TerminalPanel } from "./components/dashboard/DashboardPanels";
import { createVps, deleteVps, getDashboardOverview, listAuditEvents, listJobs, listMetrics, listVps, provisionKey, verifyKey, type DashboardOverview, type VpsRecord } from "./lib/api";

type StatusKind = "default" | "success" | "destructive";
type Status = { message: string; kind: StatusKind };

const initialCreateForm = { name: "", host: "", port: "22", username: "", password: "" };

const emptyOverview: DashboardOverview = {
  mode: "local",
  summary: { totalServers: 0, healthyServers: 0, warningServers: 0, unreachableServers: 0, runningJobs: 0 },
  servers: [],
  metrics: [],
  jobs: [],
  auditEvents: [],
  terminal: { label: "Demo terminal", networkAccess: "disabled", commands: [], sessions: [] },
  settings: { appMode: "local", webTerminalEnabled: false, realSshEnabled: false, authRequiredInLocalMode: true }
};

export function App() {
  const [records, setRecords] = useState<VpsRecord[]>([]);
  const [overview, setOverview] = useState<DashboardOverview>(emptyOverview);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [provisionPasswords, setProvisionPasswords] = useState<Record<string, string>>({});
  const [serverSearch, setServerSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeView, setActiveView] = useState<DashboardView>("overview");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>({ message: "Đang tải danh sách VPS...", kind: "default" });

  async function loadVps(message = "Danh sách VPS đã được làm mới.") {
    const [dashboard, servers, jobs, metrics, auditEvents] = await Promise.all([getDashboardOverview(), listVps(), listJobs(), listMetrics(), listAuditEvents()]);
    setOverview({
      ...dashboard,
      servers,
      jobs,
      metrics,
      auditEvents,
      summary: {
        ...dashboard.summary,
        totalServers: servers.length,
        healthyServers: servers.filter((server) => server.status === "healthy").length,
        warningServers: servers.filter((server) => server.status === "warning").length,
        unreachableServers: servers.filter((server) => server.status === "unreachable").length,
        runningJobs: jobs.filter((job) => job.status === "running").length
      }
    });
    setRecords(servers);
    setStatus({ message, kind: "success" });
  }

  async function runAction(loadingMessage: string, action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setStatus({ message: loadingMessage, kind: "default" });
    try {
      await action();
      await loadVps("Trạng thái dashboard đã đồng bộ.");
    } catch (error) {
      setStatus({ message: error instanceof Error ? error.message : "Request failed", kind: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadVps().catch((error: unknown) => setStatus({ message: error instanceof Error ? error.message : "Request failed", kind: "destructive" }));
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = createForm.password;
    const payload = { name: createForm.name.trim(), host: createForm.host.trim(), port: Number(createForm.port || 22), username: createForm.username.trim() };

    await runAction("Đang tạo VPS...", async () => {
      const created = await createVps(payload);
      if (password) {
        setStatus({ message: `Đã tạo ${created.name}. Đang provision SSH key...`, kind: "default" });
        await provisionKey(created.id, password);
        setStatus({ message: `Đã tạo VPS và provision key cho ${created.name}. Password không được lưu.`, kind: "success" });
      } else {
        setStatus({ message: `Đã tạo VPS ${created.name}. Có thể provision key sau từ danh sách.`, kind: "success" });
      }
      setCreateForm(initialCreateForm);
    });
  }

  async function handleProvision(vps: VpsRecord, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = provisionPasswords[vps.id] || "";
    if (!password) {
      setStatus({ message: "Nhập password một lần để provision SSH key.", kind: "destructive" });
      return;
    }

    await runAction(`Đang provision key cho ${vps.name}...`, async () => {
      await provisionKey(vps.id, password);
      setProvisionPasswords((current) => ({ ...current, [vps.id]: "" }));
      setStatus({ message: `Đã provision SSH key cho ${vps.name}. Password không được lưu.`, kind: "success" });
    });
  }

  async function handleVerify(vps: VpsRecord) {
    await runAction(`Đang verify key cho ${vps.name}...`, async () => {
      await verifyKey(vps.id);
      setStatus({ message: `Verify key thành công cho ${vps.name}.`, kind: "success" });
    });
  }

  async function handleDelete(vps: VpsRecord) {
    if (!window.confirm(`Xóa ${vps.name}?`)) return;
    await runAction(`Đang xóa ${vps.name}...`, async () => {
      await deleteVps(vps.id);
      setStatus({ message: `Đã xóa ${vps.name}.`, kind: "success" });
    });
  }

  const visibleRecords = records.filter((vps) => {
    const haystack = [vps.name, vps.host, vps.username, vps.provider, vps.region, vps.notes, ...(vps.tags || [])].filter(Boolean).join(" ").toLowerCase();
    const matchesSearch = haystack.includes(serverSearch.trim().toLowerCase());
    const keyState = vps.keyProvisionedAt ? "ready" : "pending";
    return matchesSearch && (statusFilter === "all" || vps.status === statusFilter || keyState === statusFilter);
  });

  const statusAlert = <Alert variant={status.kind}>{status.message}</Alert>;

  return (
    <DashboardShell activeView={activeView} onViewChange={setActiveView} mode={overview.mode} busy={busy} onRefresh={() => runAction("Đang làm mới danh sách VPS...", () => loadVps())}>
      {activeView === "overview" ? <OverviewPanel overview={overview} /> : null}
      {activeView === "servers" ? <ServersPanel records={records} visibleRecords={visibleRecords} statusMessage={statusAlert} serverSearch={serverSearch} statusFilter={statusFilter} busy={busy} provisionPasswords={provisionPasswords} createForm={createForm} onSearchChange={setServerSearch} onStatusFilterChange={setStatusFilter} onCreateFormChange={setCreateForm} onCreate={handleCreate} onPasswordChange={(id, value) => setProvisionPasswords((current) => ({ ...current, [id]: value }))} onProvision={handleProvision} onVerify={handleVerify} onDelete={handleDelete} /> : null}
      {activeView === "jobs" ? <JobsPanel jobs={overview.jobs} /> : null}
      {activeView === "metrics" ? <MetricsPanel metrics={overview.metrics} /> : null}
      {activeView === "audit" ? <AuditPanel events={overview.auditEvents} /> : null}
      {activeView === "terminal" ? <TerminalPanel terminal={overview.terminal} /> : null}
      {activeView === "settings" ? <SettingsPanel overview={overview} /> : null}
    </DashboardShell>
  );
}
