import { FormEvent, useEffect, useState } from "react";
import { KeyRound, RefreshCw, Server, ShieldCheck, Trash2 } from "lucide-react";
import { Alert } from "./components/ui/alert";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { DemoDashboard } from "./components/dashboard/DemoDashboard";
import { createVps, deleteVps, getDashboardOverview, listVps, provisionKey, verifyKey, type DashboardOverview, type VpsRecord } from "./lib/api";

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
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>({ message: "Đang tải danh sách VPS...", kind: "default" });

  async function loadVps(message = "Danh sách VPS đã được làm mới.") {
    const [dashboard, data] = await Promise.all([getDashboardOverview(), listVps()]);
    setOverview(dashboard);
    setRecords(data);
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
    const payload = {
      name: createForm.name.trim(),
      host: createForm.host.trim(),
      port: Number(createForm.port || 22),
      username: createForm.username.trim()
    };

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

  return (
    <main className="mx-auto w-[min(1120px,calc(100%-1.5rem))] py-12 md:py-16">
      <section className="mb-8 grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)]" aria-labelledby="page-title">
        <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-accent">Quản lý VPS nội bộ</p>
            <h1 id="page-title" className="max-w-3xl font-display text-5xl leading-tight tracking-tight md:text-7xl md:leading-[1.05]">
            Bảng điều khiển VPS bằng React
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            Thêm VPS, gửi password một lần để copy public key lên server, rồi xác minh truy cập SSH bằng key mà không hiển thị key material.
          </p>
        </div>
        <Alert className="border-l-[6px] border-l-accent">
          Mật khẩu chỉ nằm trong form và request provision-key. Dashboard không dùng localStorage, sessionStorage, IndexedDB hoặc cookies để lưu password.
        </Alert>
      </section>

      <DemoDashboard overview={overview} />

      <Card className="mb-6 overflow-hidden">
        <CardHeader className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-accent">Thêm server</p>
            <CardTitle>Thêm VPS mới</CardTitle>
          </div>
          <CardDescription>Điền password nếu muốn provision SSH key ngay sau khi tạo.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} autoComplete="off" className="grid gap-4 md:grid-cols-4 md:items-end">
            <Label>Tên<Input required maxLength={120} placeholder="prod-sgp-01" value={createForm.name} onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })} /></Label>
            <Label>Host / IP<Input required maxLength={255} placeholder="203.0.113.20" value={createForm.host} onChange={(event) => setCreateForm({ ...createForm, host: event.target.value })} /></Label>
            <Label>Port<Input required type="number" min={1} max={65535} value={createForm.port} onChange={(event) => setCreateForm({ ...createForm, port: event.target.value })} /></Label>
            <Label>Username<Input required maxLength={64} placeholder="root" value={createForm.username} onChange={(event) => setCreateForm({ ...createForm, username: event.target.value })} /></Label>
            <Label className="md:col-span-2">Password tùy chọn<Input type="password" maxLength={4096} autoComplete="new-password" placeholder="Chỉ dùng một lần để copy SSH key" value={createForm.password} onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })} /></Label>
            <Button type="submit" disabled={busy} className="md:col-span-2"><Server size={18} />Tạo VPS</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-accent">Kho VPS</p>
            <CardTitle>Danh sách VPS</CardTitle>
          </div>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => runAction("Đang làm mới danh sách VPS...", () => loadVps())}><RefreshCw size={18} />Làm mới</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant={status.kind}>{status.message}</Alert>
          {records.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">Chưa có VPS nào. Thêm server đầu tiên ở form phía trên.</div>
          ) : (
            <div className="grid gap-4">
              {records.map((vps) => {
                const isReady = Boolean(vps.keyProvisionedAt);
                return (
                  <article key={vps.id} className="rounded-lg border border-border bg-card/80 p-6 shadow-panel">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="text-lg font-black tracking-tight">{vps.name}</h3>
                        <p className="mt-2 break-all text-muted-foreground">{vps.username}@{vps.host}:{vps.port}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{isReady ? `Key provisioned: ${new Date(vps.keyProvisionedAt!).toLocaleString()}` : "SSH key chưa được provision."}</p>
                      </div>
                      <Badge variant={isReady ? "ready" : "pending"}>{isReady ? "Đã có key" : "Cần password"}</Badge>
                    </div>
                    <form onSubmit={(event) => handleProvision(vps, event)} autoComplete="off" className="mt-6 grid gap-3 md:grid-cols-[minmax(220px,1fr)_auto] md:items-end">
                      <Label>Password một lần<Input type="password" maxLength={4096} autoComplete="new-password" placeholder="Nhập để provision lại" value={provisionPasswords[vps.id] || ""} onChange={(event) => setProvisionPasswords((current) => ({ ...current, [vps.id]: event.target.value }))} /></Label>
                      <Button type="submit" variant="secondary" disabled={busy} className="w-full md:w-auto"><KeyRound size={18} />Cài key</Button>
                    </form>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button type="button" variant="secondary" disabled={busy} className="w-full sm:w-auto" onClick={() => handleVerify(vps)}><ShieldCheck size={18} />Kiểm tra key</Button>
                      <Button type="button" variant="destructive" disabled={busy} className="w-full sm:w-auto" onClick={() => handleDelete(vps)}><Trash2 size={18} />Xóa</Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
