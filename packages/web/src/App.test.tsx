import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./test/setup";
import { App } from "./App";

const fetchMock = vi.fn();

const emptyDashboard = {
  mode: "local",
  summary: { totalServers: 0, healthyServers: 0, warningServers: 0, unreachableServers: 0, runningJobs: 0 },
  servers: [],
  metrics: [],
  jobs: [],
  auditEvents: [],
  terminal: { label: "Demo terminal", networkAccess: "disabled", commands: [], sessions: [] },
  settings: { appMode: "local", webTerminalEnabled: false, realSshEnabled: false, authRequiredInLocalMode: true }
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("confirm", vi.fn(() => true));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
});

describe("React dashboard", () => {
  it("loads default overview then switches to servers empty state", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: emptyDashboard }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [] }) });

    render(<App />);

    expect(await screen.findByText("Operations dashboard")).toBeInTheDocument();
    expect(screen.getByText("Passwords are sent only for one-time key provisioning and are not stored in browser storage.")).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: "Servers" })[0]);
    expect(await screen.findByText("Chưa có VPS nào. Thêm server đầu tiên ở form bên cạnh.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/vps", expect.any(Object));
  });

  it("creates a VPS then provisions key only when one-time password is submitted", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: emptyDashboard }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ data: { id: "vps_1", name: "prod", host: "203.0.113.20", port: 22, username: "root", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: { id: "vps_1", name: "prod" } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: emptyDashboard }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [
        { id: "demo-edge-sgp-01", name: "edge-sgp-01", host: "demo-edge.internal", port: 22, username: "deploy", provider: "Hetzner", region: "Singapore", tags: ["edge", "public"], status: "healthy", lastSeenAt: "2026-01-01T00:10:00.000Z", notes: "Handles public ingress.", keyProvisionedAt: "2026-01-01T00:05:00.000Z", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }
      ] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [] }) });

    render(<App />);
    await screen.findByText("Operations dashboard");
    await userEvent.click(screen.getAllByRole("button", { name: "Servers" })[0]);
    await screen.findByText("Chưa có VPS nào. Thêm server đầu tiên ở form bên cạnh.");

    await userEvent.type(screen.getByLabelText(/Tên/i), "prod");
    await userEvent.type(screen.getByLabelText(/Host/i), "203.0.113.20");
    await userEvent.type(screen.getByLabelText(/Username/i), "root");
    await userEvent.type(screen.getByLabelText(/Password tùy chọn/i), "secret-once");
    await userEvent.click(screen.getByRole("button", { name: /Tạo VPS/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/vps/vps_1/provision-key", expect.objectContaining({ method: "POST", body: JSON.stringify({ password: "secret-once" }) })));
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it("renders demo operations overview from dashboard data", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            mode: "demo",
            banner: "Demo mode: simulated servers, no real SSH connections.",
            summary: { totalServers: 3, healthyServers: 1, warningServers: 1, unreachableServers: 1, runningJobs: 1 },
            servers: [
              { id: "demo-edge-sgp-01", name: "edge-sgp-01", host: "demo-edge.internal", port: 22, username: "deploy", provider: "Hetzner", region: "Singapore", tags: ["edge", "public"], status: "healthy", lastSeenAt: "2026-01-01T00:10:00.000Z", notes: "Handles public ingress.", keyProvisionedAt: "2026-01-01T00:05:00.000Z", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
              { id: "demo-api-fra-02", name: "api-fra-02", host: "demo-api.internal", port: 22, username: "deploy", status: "warning", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
              { id: "demo-worker-sfo-01", name: "worker-sfo-01", host: "demo-worker.internal", port: 22, username: "deploy", status: "unreachable", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }
            ],
            metrics: [{ vpsId: "demo-edge-sgp-01", cpu: 22, memory: 48, disk: 61, loadAverage: 0.41, networkRx: 128_400, networkTx: 93_200, uptime: 691_200, collectedAt: new Date().toISOString(), freshness: "fresh" }],
            jobs: [
              { id: "job_demo_queued", vpsId: "demo-worker-sfo-01", type: "check disk usage", status: "queued", progress: 0, workerId: "worker-queue-01" },
              { id: "job_demo_collect_metrics", vpsId: "demo-edge-sgp-01", type: "collect metrics", status: "running", progress: 64, workerId: "worker-metrics-01" },
              { id: "job_demo_verify_key", vpsId: "demo-api-fra-02", type: "verify key", status: "succeeded", progress: 100, workerId: "worker-crypto-02" }
            ],
            auditEvents: [{ id: "audit_demo_dashboard_view", actor: "demo", action: "demo.dashboard.view", resourceType: "dashboard", result: "success", timestamp: "2026-01-01T00:00:00.000Z" }],
            terminal: { label: "Demo terminal", networkAccess: "disabled", commands: ["uptime", "df -h"], sessions: [{ command: "uptime", output: "up 8 days" }] },
            settings: { appMode: "demo", webTerminalEnabled: false, realSshEnabled: false, authRequiredInLocalMode: true }
          }
        })
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [
        { id: "demo-edge-sgp-01", name: "edge-sgp-01", host: "demo-edge.internal", port: 22, username: "deploy", provider: "Hetzner", region: "Singapore", tags: ["edge", "public"], status: "healthy", lastSeenAt: "2026-01-01T00:10:00.000Z", notes: "Handles public ingress.", keyProvisionedAt: "2026-01-01T00:05:00.000Z", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }
      ] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [
        { id: "job_demo_queued", vpsId: "demo-worker-sfo-01", type: "check disk usage", status: "queued", progress: 0 },
        { id: "job_demo_collect_metrics", vpsId: "demo-edge-sgp-01", type: "collect metrics", status: "running", progress: 64 },
        { id: "job_demo_verify_key", vpsId: "demo-api-fra-02", type: "verify key", status: "succeeded", progress: 100 }
      ] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [{ vpsId: "demo-edge-sgp-01", cpu: 22, memory: 48, disk: 61, loadAverage: 0.41, networkRx: 128_400, networkTx: 93_200, uptime: 691_200, collectedAt: new Date().toISOString(), freshness: "fresh" }] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [{ id: "audit_demo_dashboard_view", actor: "demo", action: "demo.dashboard.view", resourceType: "dashboard", result: "success", timestamp: "2026-01-01T00:00:00.000Z" }] }) });

    render(<App />);

    expect(await screen.findByText("Demo mode: simulated servers, no real SSH connections.")).toBeInTheDocument();
    expect(screen.getByText("1 healthy")).toBeInTheDocument();
    expect(screen.getByText("CPU load")).toBeInTheDocument();
    expect(screen.getByText("collect metrics")).toBeInTheDocument();
    expect(screen.getByText(/demo-edge-sgp-01 · 64% progress/)).toBeInTheDocument();
    expect(screen.getByText("demo.dashboard.view")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Dashboard sections" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Dashboard sidebar sections" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Overview" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Servers" }).length).toBeGreaterThan(0);

    await userEvent.click(screen.getAllByRole("button", { name: "Servers" })[0]);
    expect(screen.getByText("edge-sgp-01")).toBeInTheDocument();
    expect(screen.getByText("Hetzner")).toBeInTheDocument();
    expect(screen.getByText("Singapore")).toBeInTheDocument();
    expect(screen.getByText("Handles public ingress.")).toBeInTheDocument();
    expect(screen.getByText("edge")).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("button", { name: "Metrics" })[0]);
    expect(screen.getByText(/CPU 22% · Memory 48% · Disk 61%/)).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("button", { name: "Terminal" })[0]);
    expect(screen.getByText("Demo terminal")).toBeInTheDocument();
    expect(screen.getByText("No real SSH connections"));

    await userEvent.click(screen.getAllByRole("button", { name: "Settings" })[0]);
    expect(screen.getByText("APP_MODE=demo")).toBeInTheDocument();
  });

  it("filters local VPS cards without storing secrets", async () => {
    const localDashboard = { ...emptyDashboard, mode: "demo", settings: { ...emptyDashboard.settings, appMode: "demo" } };
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: localDashboard }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [
        { id: "vps_1", name: "prod-sgp-01", host: "203.0.113.20", port: 22, username: "root", provider: "Linode", region: "Singapore", tags: ["prod"], status: "healthy", lastSeenAt: "2026-01-01T00:00:00.000Z", notes: "Primary node", keyProvisionedAt: "2026-01-01T00:00:00.000Z", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
        { id: "vps_2", name: "dev-fra-01", host: "203.0.113.21", port: 22, username: "deploy", provider: "OVH", region: "Frankfurt", tags: ["dev"], status: "warning", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }
      ] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [] }) });

    render(<App />);

    expect(await screen.findByText("Passwords are sent only for one-time key provisioning and are not stored in browser storage.")).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: "Servers" })[0]);
    expect(screen.getByText("Primary node")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Tìm server"), "ovh");
    expect(screen.queryByText("prod-sgp-01")).not.toBeInTheDocument();
    expect(screen.getByText("dev-fra-01")).toBeInTheDocument();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
});
