import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "./test/setup";
import { App } from "./App";

const fetchMock = vi.fn();

// ── Mock EventSource ──────────────────────────────────────────────────

type EventCallback = (event: MessageEvent) => void;
type OpenCallback = () => void;
type ErrorCallback = (event: Event) => void;

let mockEventSourceInstance: {
  url: string;
  close: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  dispatchEvent: (type: string, data: string) => void;
  triggerOpen: () => void;
  triggerError: () => void;
  onopen: OpenCallback | null;
  onerror: ErrorCallback | null;
} | null = null;

let eventSourceConstructorSpy: ReturnType<typeof vi.fn>;

function createMockEventSource() {
  const listeners = new Map<string, Set<EventCallback>>();
  let closed = false;

  const instance = {
    url: "",
    close: vi.fn(() => {
      closed = true;
    }),
    addEventListener: vi.fn((type: string, callback: EventCallback) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(callback);
    }),
    removeEventListener: vi.fn((type: string, callback: EventCallback) => {
      listeners.get(type)?.delete(callback);
    }),
    dispatchEvent: (type: string, data: string) => {
      if (closed) return;
      const callbacks = listeners.get(type);
      if (callbacks) {
        const event = new MessageEvent(type, { data });
        for (const cb of callbacks) cb(event);
      }
    },
    triggerOpen: () => {
      if (instance.onopen) instance.onopen();
    },
    triggerError: () => {
      if (instance.onerror) instance.onerror(new Event("error"));
    },
    onopen: null as OpenCallback | null,
    onerror: null as ErrorCallback | null,
  };

  return instance;
}

function stubEventSource() {
  mockEventSourceInstance = null;

  eventSourceConstructorSpy = vi.fn((url: string) => {
    const instance = createMockEventSource();
    instance.url = url;
    mockEventSourceInstance = instance;
    return instance;
  });

  vi.stubGlobal("EventSource", eventSourceConstructorSpy);
}

const emptyDashboard = {
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

function makeEnvelope(type: string, payload: unknown) {
  return JSON.stringify({
    schemaVersion: 1,
    type,
    id: "test-id",
    emittedAt: new Date().toISOString(),
    payload,
  });
}

function authOk(mode: "demo" | "local" = "local", authRequired = true) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      data: { mode, authenticated: authRequired, authRequired },
    }),
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  window.history.replaceState({}, "", "/");
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal(
    "confirm",
    vi.fn(() => true),
  );
  stubEventSource();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
  mockEventSourceInstance = null;
});

describe("React dashboard", () => {
  it("loads default overview then switches to servers empty state", async () => {
    fetchMock
      .mockResolvedValueOnce(authOk())
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: emptyDashboard }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      });

    render(<App />);

    expect(await screen.findByText("Command dashboard")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Passwords are sent only for one-time key provisioning and are not stored in browser storage.",
      ),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getAllByRole("button", { name: "Servers" })[0],
    );
    expect(window.location.pathname).toBe("/servers");
    expect(
      await screen.findByText(
        "No VPS servers yet. Add your first server with the form beside this list.",
      ),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/vps", expect.any(Object));
  });

  it("opens a dashboard section from its route", async () => {
    window.history.replaceState({}, "", "/metrics");
    fetchMock
      .mockResolvedValueOnce(authOk())
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: emptyDashboard }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      });

    render(<App />);

    expect(
      await screen.findByText(
        "Telemetry freshness and resource usage by server.",
      ),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe("/metrics");
  });

  it("creates a VPS then provisions key only when one-time password is submitted", async () => {
    fetchMock
      .mockResolvedValueOnce(authOk())
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: emptyDashboard }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          data: {
            id: "vps_1",
            name: "prod",
            host: "203.0.113.20",
            port: 22,
            username: "root",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { id: "vps_1", name: "prod" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: emptyDashboard }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              id: "demo-edge-sgp-01",
              name: "edge-sgp-01",
              host: "demo-edge.internal",
              port: 22,
              username: "deploy",
              provider: "Hetzner",
              region: "Singapore",
              tags: ["edge", "public"],
              status: "healthy",
              lastSeenAt: "2026-01-01T00:10:00.000Z",
              notes: "Handles public ingress.",
              keyProvisionedAt: "2026-01-01T00:05:00.000Z",
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      });

    render(<App />);
    await screen.findByText("Command dashboard");
    await userEvent.click(
      screen.getAllByRole("button", { name: "Servers" })[0],
    );
    await screen.findByText(
      "No VPS servers yet. Add your first server with the form beside this list.",
    );

    await userEvent.type(screen.getByLabelText("Name"), "prod");
    await userEvent.type(screen.getByLabelText(/Host/i), "203.0.113.20");
    await userEvent.type(screen.getByLabelText(/Username/i), "root");
    await userEvent.type(
      screen.getByLabelText(/Optional password/i),
      "secret-once",
    );
    await userEvent.click(screen.getByRole("button", { name: /Create VPS/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/vps/vps_1/provision-key",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ password: "secret-once" }),
        }),
      ),
    );
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it("renders demo operations overview from dashboard data", async () => {
    fetchMock
      .mockResolvedValueOnce(authOk("demo", false))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            mode: "demo",
            banner: "Demo mode: simulated servers, no real SSH connections.",
            summary: {
              totalServers: 3,
              healthyServers: 1,
              warningServers: 1,
              unreachableServers: 1,
              runningJobs: 1,
            },
            servers: [
              {
                id: "demo-edge-sgp-01",
                name: "edge-sgp-01",
                host: "demo-edge.internal",
                port: 22,
                username: "deploy",
                provider: "Hetzner",
                region: "Singapore",
                tags: ["edge", "public"],
                status: "healthy",
                lastSeenAt: "2026-01-01T00:10:00.000Z",
                notes: "Handles public ingress.",
                keyProvisionedAt: "2026-01-01T00:05:00.000Z",
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
              },
              {
                id: "demo-api-fra-02",
                name: "api-fra-02",
                host: "demo-api.internal",
                port: 22,
                username: "deploy",
                status: "warning",
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
              },
              {
                id: "demo-worker-sfo-01",
                name: "worker-sfo-01",
                host: "demo-worker.internal",
                port: 22,
                username: "deploy",
                status: "unreachable",
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
              },
            ],
            metrics: [
              {
                vpsId: "demo-edge-sgp-01",
                cpu: 22,
                memory: 48,
                disk: 61,
                loadAverage: 0.41,
                networkRx: 128_400,
                networkTx: 93_200,
                uptime: 691_200,
                collectedAt: new Date().toISOString(),
                freshness: "fresh",
              },
            ],
            jobs: [
              {
                id: "job_demo_queued",
                vpsId: "demo-worker-sfo-01",
                type: "check disk usage",
                status: "queued",
                progress: 0,
                workerId: "worker-queue-01",
              },
              {
                id: "job_demo_collect_metrics",
                vpsId: "demo-edge-sgp-01",
                type: "collect metrics",
                status: "running",
                progress: 64,
                workerId: "worker-metrics-01",
              },
              {
                id: "job_demo_verify_key",
                vpsId: "demo-api-fra-02",
                type: "verify key",
                status: "succeeded",
                progress: 100,
                workerId: "worker-crypto-02",
              },
            ],
            auditEvents: [
              {
                id: "audit_demo_dashboard_view",
                actor: "demo",
                action: "demo.dashboard.view",
                resourceType: "dashboard",
                result: "success",
                timestamp: "2026-01-01T00:00:00.000Z",
              },
            ],
            terminal: {
              label: "Demo terminal",
              networkAccess: "disabled",
              commands: ["uptime", "df -h"],
              sessions: [{ command: "uptime", output: "up 8 days" }],
            },
            settings: {
              appMode: "demo",
              webTerminalEnabled: false,
              realSshEnabled: false,
              authRequiredInLocalMode: true,
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              id: "demo-edge-sgp-01",
              name: "edge-sgp-01",
              host: "demo-edge.internal",
              port: 22,
              username: "deploy",
              provider: "Hetzner",
              region: "Singapore",
              tags: ["edge", "public"],
              status: "healthy",
              lastSeenAt: "2026-01-01T00:10:00.000Z",
              notes: "Handles public ingress.",
              keyProvisionedAt: "2026-01-01T00:05:00.000Z",
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              id: "job_demo_queued",
              vpsId: "demo-worker-sfo-01",
              type: "check disk usage",
              status: "queued",
              progress: 0,
            },
            {
              id: "job_demo_collect_metrics",
              vpsId: "demo-edge-sgp-01",
              type: "collect metrics",
              status: "running",
              progress: 64,
            },
            {
              id: "job_demo_verify_key",
              vpsId: "demo-api-fra-02",
              type: "verify key",
              status: "succeeded",
              progress: 100,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              vpsId: "demo-edge-sgp-01",
              cpu: 22,
              memory: 48,
              disk: 61,
              loadAverage: 0.41,
              networkRx: 128_400,
              networkTx: 93_200,
              uptime: 691_200,
              collectedAt: new Date().toISOString(),
              freshness: "fresh",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              id: "audit_demo_dashboard_view",
              actor: "demo",
              action: "demo.dashboard.view",
              resourceType: "dashboard",
              result: "success",
              timestamp: "2026-01-01T00:00:00.000Z",
            },
          ],
        }),
      });

    render(<App />);

    expect(
      await screen.findByText(
        "Demo mode: simulated servers, no real SSH connections.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("1 healthy")).toBeInTheDocument();
    expect(screen.getByText("CPU load")).toBeInTheDocument();
    expect(screen.getByText("collect metrics")).toBeInTheDocument();
    expect(
      screen.getByText(/demo-edge-sgp-01.*64% progress/),
    ).toBeInTheDocument();
    expect(screen.getByText("demo.dashboard.view")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Dashboard sections" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Dashboard sidebar sections" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Overview" }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", { name: "Servers" }).length,
    ).toBeGreaterThan(0);

    await userEvent.click(
      screen.getAllByRole("button", { name: "Servers" })[0],
    );
    expect(screen.getByText("edge-sgp-01")).toBeInTheDocument();
    expect(screen.getByText("Hetzner")).toBeInTheDocument();
    expect(screen.getByText("Singapore")).toBeInTheDocument();
    expect(screen.getByText("Handles public ingress.")).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes("edge, public")),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getAllByRole("button", { name: "Metrics" })[0],
    );
    expect(screen.getAllByText("CPU").length).toBeGreaterThan(0);
    expect(screen.getAllByText("22%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("48%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("61%").length).toBeGreaterThan(0);

    await userEvent.click(
      screen.getAllByRole("button", { name: "Terminal" })[0],
    );
    expect(screen.getAllByText("Demo terminal").length).toBeGreaterThan(0);
    expect(screen.getByText(/No stored password and no write/i)).toBeInTheDocument();

    await userEvent.click(
      screen.getAllByRole("button", { name: "Settings" })[0],
    );
    expect(screen.getByText("APP_MODE=demo")).toBeInTheDocument();
  });

  it("filters local VPS cards without storing secrets", async () => {
    const localDashboard = {
      ...emptyDashboard,
      mode: "demo",
      settings: { ...emptyDashboard.settings, appMode: "demo" },
    };
    fetchMock
      .mockResolvedValueOnce(authOk("demo", false))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: localDashboard }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              id: "vps_1",
              name: "prod-sgp-01",
              host: "203.0.113.20",
              port: 22,
              username: "root",
              provider: "Linode",
              region: "Singapore",
              tags: ["prod"],
              status: "healthy",
              lastSeenAt: "2026-01-01T00:00:00.000Z",
              notes: "Primary node",
              keyProvisionedAt: "2026-01-01T00:00:00.000Z",
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
            {
              id: "vps_2",
              name: "dev-fra-01",
              host: "203.0.113.21",
              port: 22,
              username: "deploy",
              provider: "OVH",
              region: "Frankfurt",
              tags: ["dev"],
              status: "warning",
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      });

    render(<App />);

    expect(
      await screen.findByText(
        "Passwords are sent only for one-time key provisioning and are not stored in browser storage.",
      ),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getAllByRole("button", { name: "Servers" })[0],
    );
    expect(screen.getByText("Primary node")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Search servers"), "ovh");
    expect(screen.queryByText("prod-sgp-01")).not.toBeInTheDocument();
    expect(screen.getByText("dev-fra-01")).toBeInTheDocument();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  describe("SSE live monitoring events", () => {
    function renderAppWithLiveEvents(mockData: any) {
      fetchMock
        .mockResolvedValueOnce(authOk("demo", false))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: mockData.dashboard }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: mockData.servers }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: mockData.jobs }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: mockData.metrics }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: mockData.auditEvents }),
        });

      render(<App />);
      return mockEventSourceInstance;
    }

    const demoDashboard = {
      mode: "demo",
      banner: "Demo mode: simulated servers, no real SSH connections.",
      summary: {
        totalServers: 3,
        healthyServers: 1,
        warningServers: 1,
        unreachableServers: 1,
        runningJobs: 1,
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
        appMode: "demo",
        webTerminalEnabled: false,
        realSshEnabled: false,
        authRequiredInLocalMode: true,
      },
    };

    const demoServerRecords = [
      { id: "vps-1", name: "web-01", host: "10.0.0.1", port: 22, username: "root", status: "healthy", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
    ];

    it("metrics.updated event changes displayed metrics without crashing", async () => {
      renderAppWithLiveEvents({
        dashboard: demoDashboard,
        servers: demoServerRecords,
        jobs: [],
        metrics: [],
        auditEvents: [],
      });

      expect(
        await screen.findByText("Demo mode: simulated servers, no real SSH connections."),
      ).toBeInTheDocument();

      // Navigate to metrics panel
      await userEvent.click(
        screen.getAllByRole("button", { name: "Metrics" })[0],
      );

      expect(await screen.findByText("No metrics match these filters.")).toBeInTheDocument();

      // Simulate a metrics.updated event via EventSource
      const metricsPayload = {
        metrics: [
          {
            vpsId: "vps-1",
            cpu: 42,
            memory: 63,
            disk: 55,
            loadAverage: 1.2,
            networkRx: 100000,
            networkTx: 50000,
            uptime: 3600,
            collectedAt: new Date().toISOString(),
            freshness: "fresh" as const,
          },
        ],
      };

      mockEventSourceInstance?.dispatchEvent("metrics.updated", makeEnvelope("metrics.updated", metricsPayload));

      // Wait for metrics to appear (may appear in multiple places)
      await waitFor(() => {
        expect(screen.getAllByText("42%").length).toBeGreaterThanOrEqual(1);
      });
      expect(screen.getAllByText("63%").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("55%").length).toBeGreaterThanOrEqual(1);

      // No passwords stored
      expect(localStorage.length).toBe(0);
      expect(sessionStorage.length).toBe(0);
    });

    it("merges Docker metrics from live updates and toggles intent safely", async () => {
      const server = { ...demoServerRecords[0], dockerMetricsEnabled: true };
      renderAppWithLiveEvents({
        dashboard: demoDashboard,
        servers: [server],
        jobs: [],
        metrics: [],
        auditEvents: [],
      });

      await screen.findByText("Demo mode: simulated servers, no real SSH connections.");
      await userEvent.click(screen.getAllByRole("button", { name: "Servers" })[0]);
      expect(await screen.findByText("Waiting for Docker-capable agent.")).toBeInTheDocument();

      mockEventSourceInstance?.dispatchEvent("metrics.updated", makeEnvelope("metrics.updated", {
        metrics: [],
        dockerMetrics: [{
          vpsId: "vps-1",
          collectedAt: new Date().toISOString(),
          receivedAt: new Date().toISOString(),
          schemaVersion: 1,
          available: true,
          containerTotal: 2,
          containerRunning: 1,
          cpuPercent: 12.5,
          memoryUsageBytes: 268435456,
          networkRxBytes: 1024,
          networkTxBytes: 2048,
          blockReadBytes: 4096,
          blockWriteBytes: 8192,
          pids: 9,
          containers: [{
            id: "abc123",
            name: "api",
            image: "app:latest",
            state: "running",
            status: "Up 2 minutes",
            cpuPercent: 10,
            memoryUsageBytes: 134217728,
            networkRxBytes: 100,
            networkTxBytes: 200,
            blockReadBytes: 300,
            blockWriteBytes: 400,
            pids: 4,
          }],
        }],
      }));

      expect(await screen.findByText("1/2 running")).toBeInTheDocument();
      expect(screen.getByText(/api/)).toBeInTheDocument();

      fetchMock
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: { ...server, dockerMetricsEnabled: false } }) })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: { ...demoDashboard, dockerMetrics: [] } }) })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [{ ...server, dockerMetricsEnabled: false }] }) })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [] }) })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [] }) })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: [] }) });

      await userEvent.click(screen.getByRole("button", { name: "Disable Docker metrics for web-01" }));
      await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/vps/vps-1", expect.objectContaining({ method: "PATCH" })));
      expect(window.confirm).not.toHaveBeenCalled();
      expect(localStorage.length).toBe(0);
      expect(sessionStorage.length).toBe(0);
    });

    it("unknown event types are ignored without crashing", async () => {
      renderAppWithLiveEvents({
        dashboard: demoDashboard,
        servers: demoServerRecords,
        jobs: [],
        metrics: [],
        auditEvents: [],
      });

      expect(
        await screen.findByText("Demo mode: simulated servers, no real SSH connections."),
      ).toBeInTheDocument();

      // Dispatch an unknown event type
      mockEventSourceInstance?.dispatchEvent("unknown.event", makeEnvelope("unknown.event", { foo: "bar" }));

      // App should still be functional - navigate and check
      await userEvent.click(
        screen.getAllByRole("button", { name: "Metrics" })[0],
      );

      expect(await screen.findByText("No metrics match these filters.")).toBeInTheDocument();

      // Dispatch a valid metrics.updated to ensure it still works
      const metricsPayload = {
        metrics: [
          {
            vpsId: "vps-1",
            cpu: 55,
            memory: 70,
            disk: 60,
            loadAverage: 1.0,
            networkRx: 100000,
            networkTx: 50000,
            uptime: 3600,
            collectedAt: new Date().toISOString(),
            freshness: "fresh" as const,
          },
        ],
      };

      mockEventSourceInstance?.dispatchEvent("metrics.updated", makeEnvelope("metrics.updated", metricsPayload));

      await waitFor(() => {
        expect(screen.getAllByText("55%").length).toBeGreaterThanOrEqual(1);
      });

      expect(localStorage.length).toBe(0);
    });

    it("shows live connection state in header", async () => {
      renderAppWithLiveEvents({
        dashboard: { ...demoDashboard, mode: "local" },
        servers: demoServerRecords,
        jobs: [],
        metrics: [],
        auditEvents: [],
      });

      // Initially shows Connecting (EventSource is opened)
      await waitFor(() => {
        expect(screen.getByText("Connecting")).toBeInTheDocument();
      });

      // Simulate hello event which transitions to Live
      mockEventSourceInstance?.dispatchEvent(
        "monitoring.hello",
        makeEnvelope("monitoring.hello", { mode: "local", intervalMs: 5000 }),
      );

      await waitFor(() => {
        expect(screen.getByText("Live")).toBeInTheDocument();
      });

      expect(localStorage.length).toBe(0);
      expect(sessionStorage.length).toBe(0);
    });

    it("monitoring.heartbeat updates live timestamp without changing metrics", async () => {
      renderAppWithLiveEvents({
        dashboard: { ...demoDashboard, mode: "local" },
        servers: demoServerRecords,
        jobs: [],
        metrics: [],
        auditEvents: [],
      });

      expect(
        await screen.findByText("Demo mode: simulated servers, no real SSH connections."),
      ).toBeInTheDocument();

      // Navigate to metrics
      await userEvent.click(
        screen.getAllByRole("button", { name: "Metrics" })[0],
      );
      expect(await screen.findByText("No metrics match these filters.")).toBeInTheDocument();

      // Send hello first to go live
      mockEventSourceInstance?.dispatchEvent(
        "monitoring.hello",
        makeEnvelope("monitoring.hello", { mode: "local", intervalMs: 5000 }),
      );

      await waitFor(() => {
        expect(screen.getByText("Live")).toBeInTheDocument();
      });

      // Send heartbeat
      mockEventSourceInstance?.dispatchEvent(
        "monitoring.heartbeat",
        makeEnvelope("monitoring.heartbeat", {}),
      );

      // Still "Live" (heartbeat updates timestamp, keeps status as live)
      expect(screen.getByText("Live")).toBeInTheDocument();

      // Metrics still show empty state
      expect(screen.getByText("No metrics match these filters.")).toBeInTheDocument();

      expect(localStorage.length).toBe(0);
    });
  });
});
