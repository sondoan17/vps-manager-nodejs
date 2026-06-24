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
  it("loads VPS list and renders Vietnamese empty state", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: emptyDashboard }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [] }) });

    render(<App />);

    expect(await screen.findByText("Chưa có VPS nào. Thêm server đầu tiên ở form phía trên.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/vps", expect.any(Object));
  });

  it("creates a VPS then provisions key only when one-time password is submitted", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: emptyDashboard }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [] }) })
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ data: { id: "vps_1", name: "prod", host: "203.0.113.20", port: 22, username: "root", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: { id: "vps_1", name: "prod" } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: emptyDashboard }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [] }) });

    render(<App />);
    await screen.findByText("Chưa có VPS nào. Thêm server đầu tiên ở form phía trên.");

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
              { id: "demo-edge-sgp-01", name: "edge-sgp-01", host: "demo-edge.internal", port: 22, username: "deploy", status: "healthy", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
              { id: "demo-api-fra-02", name: "api-fra-02", host: "demo-api.internal", port: 22, username: "deploy", status: "warning", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
              { id: "demo-worker-sfo-01", name: "worker-sfo-01", host: "demo-worker.internal", port: 22, username: "deploy", status: "unreachable", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }
            ],
            metrics: [],
            jobs: [
              { id: "job_demo_queued", vpsId: "demo-worker-sfo-01", type: "check disk usage", status: "queued", progress: 0 },
              { id: "job_demo_collect_metrics", vpsId: "demo-edge-sgp-01", type: "collect metrics", status: "running", progress: 64 },
              { id: "job_demo_verify_key", vpsId: "demo-api-fra-02", type: "verify key", status: "succeeded", progress: 100 }
            ],
            auditEvents: [{ id: "audit_demo_dashboard_view", actor: "demo", action: "demo.dashboard.view", resourceType: "dashboard", result: "success", timestamp: "2026-01-01T00:00:00.000Z" }],
            terminal: { label: "Demo terminal", networkAccess: "disabled", commands: ["uptime", "df -h"], sessions: [{ command: "uptime", output: "up 8 days" }] },
            settings: { appMode: "demo", webTerminalEnabled: false, realSshEnabled: false, authRequiredInLocalMode: true }
          }
        })
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [] }) });

    render(<App />);

    expect(await screen.findByText("Demo mode: simulated servers, no real SSH connections.")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("edge-sgp-01")).toBeInTheDocument();
    expect(screen.getByText("api-fra-02")).toBeInTheDocument();
    expect(screen.getByText("worker-sfo-01")).toBeInTheDocument();
    expect(screen.getByText("demo.dashboard.view")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Dashboard sections" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Servers" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Jobs" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Metrics" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Terminal" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Audit Log" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByText("collect metrics")).toBeInTheDocument();
    expect(screen.getByText("64% progress")).toBeInTheDocument();
    expect(screen.getByText("Demo terminal")).toBeInTheDocument();
    expect(screen.getByText("No real SSH connections"));
    expect(screen.getByText("APP_MODE=demo")).toBeInTheDocument();
  });
});
