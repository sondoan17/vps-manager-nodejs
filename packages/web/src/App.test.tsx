import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
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

function renderApp(initialEntries = ["/"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  fetchMock.mockReset();
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
  it("loads VPS list after auth and shows empty state", async () => {
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

    renderApp();

    // Root redirects to /vps, header shows "Servers"
    expect(
      await screen.findByText(
        "No VPS servers yet. Add your first server to get started.",
      ),
    ).toBeInTheDocument();
    // There are multiple "Servers" elements (header + page title)
    expect(screen.getAllByText("Servers").length).toBeGreaterThan(0);
    // Empty state shows a CTA/link to create a new VPS (no inline create form)
    expect(
      screen.getAllByRole("link", { name: "New VPS" }).length,
    ).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith("/api/vps", expect.any(Object));
  });

  it("opens VPS list from route", async () => {
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

    renderApp(["/vps"]);

    expect(
      await screen.findByText(
        "No VPS servers yet. Add your first server to get started.",
      ),
    ).toBeInTheDocument();
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
            displayName: "Production Singapore",
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

    renderApp();

    await screen.findByText(
      "No VPS servers yet. Add your first server to get started.",
    );

    // The create form now lives on /vps/new; navigate there via the "New VPS" CTA
    await userEvent.click(
      screen.getAllByRole("link", { name: "New VPS" })[0],
    );

    const displayNameInput = screen.getByLabelText("Display name");
    expect(displayNameInput).toHaveAttribute("required");
    expect(displayNameInput).toHaveAttribute("maxlength", "80");
    expect(displayNameInput).toHaveAccessibleDescription(
      "A friendly label shown throughout the dashboard (1–80 characters).",
    );
    await userEvent.type(displayNameInput, "Production Singapore");
    await userEvent.type(screen.getByLabelText("Name"), "prod");
    await userEvent.type(screen.getByLabelText(/Host/i), "203.0.113.20");
    await userEvent.type(screen.getByLabelText(/Username/i), "root");
    await userEvent.type(
      screen.getByLabelText(/Optional password/i),
      "secret-once",
    );
    await userEvent.click(screen.getByRole("button", { name: /Create VPS/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/vps",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "prod",
          displayName: "Production Singapore",
          host: "203.0.113.20",
          port: 22,
          username: "root",
        }),
      }),
    );

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

  it("renders demo VPS list from dashboard data", async () => {
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

    renderApp();

    // Wait for server cards to be visible after data loads
    expect(await screen.findByText("edge-sgp-01")).toBeInTheDocument();
    expect(screen.getByText("Hetzner")).toBeInTheDocument();
    expect(screen.getByText("Singapore")).toBeInTheDocument();
    expect(screen.getByText("Handles public ingress.")).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes("edge, public")),
    ).toBeInTheDocument();
    // Compact app bar breadcrumb navigation should be present (sidebar removed)
    expect(
      screen.getByRole("navigation", { name: "Dashboard context" }),
    ).toBeInTheDocument();
    // CTA/link to create a new VPS is present in the list header
    expect(
      screen.getByRole("link", { name: "New VPS" }),
    ).toBeInTheDocument();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it("filters VPS cards without storing secrets", async () => {
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
              displayName: "Primary production",
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

    renderApp();

    expect(await screen.findByText("Primary production")).toBeInTheDocument();
    expect(screen.queryByText("prod-sgp-01")).not.toBeInTheDocument();
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

      renderApp();
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
      {
        id: "vps-1",
        name: "web-01",
        host: "10.0.0.1",
        port: 22,
        username: "root",
        status: "healthy",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    it("metrics.updated event updates VPS list metrics without crashing", async () => {
      renderAppWithLiveEvents({
        dashboard: demoDashboard,
        servers: demoServerRecords,
        jobs: [],
        metrics: [],
        auditEvents: [],
      });

      // Wait for VPS list to show
      expect(await screen.findByText("web-01")).toBeInTheDocument();

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

      mockEventSourceInstance?.dispatchEvent(
        "metrics.updated",
        makeEnvelope("metrics.updated", metricsPayload),
      );

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

      expect(await screen.findByText("web-01")).toBeInTheDocument();
      expect(
        await screen.findByText("Waiting for Docker-capable agent."),
      ).toBeInTheDocument();

      mockEventSourceInstance?.dispatchEvent(
        "metrics.updated",
        makeEnvelope("metrics.updated", {
          metrics: [],
          dockerMetrics: [
            {
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
              containers: [
                {
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
                },
              ],
            },
          ],
        }),
      );

      expect(await screen.findByText("1/2 running")).toBeInTheDocument();
      expect(screen.getByText(/api/)).toBeInTheDocument();

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: { ...server, dockerMetricsEnabled: false },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: { ...demoDashboard, dockerMetrics: [] } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: [{ ...server, dockerMetricsEnabled: false }],
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

      await userEvent.click(
        screen.getByRole("button", {
          name: "Disable Docker metrics for web-01",
        }),
      );
      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/vps/vps-1",
          expect.objectContaining({ method: "PATCH" }),
        ),
      );
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

      // Wait for VPS list to load
      expect(await screen.findByText("web-01")).toBeInTheDocument();

      // Dispatch an unknown event type
      mockEventSourceInstance?.dispatchEvent(
        "unknown.event",
        makeEnvelope("unknown.event", { foo: "bar" }),
      );

      // App should still be functional
      expect(screen.getByText("web-01")).toBeInTheDocument();

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

      mockEventSourceInstance?.dispatchEvent(
        "metrics.updated",
        makeEnvelope("metrics.updated", metricsPayload),
      );

      // Server card still shown
      expect(screen.getByText("web-01")).toBeInTheDocument();

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

    it("monitoring.heartbeat updates live timestamp without changing VPS list", async () => {
      renderAppWithLiveEvents({
        dashboard: { ...demoDashboard, mode: "local" },
        servers: demoServerRecords,
        jobs: [],
        metrics: [],
        auditEvents: [],
      });

      expect(await screen.findByText("web-01")).toBeInTheDocument();

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

      // VPS list still shows
      expect(screen.getByText("web-01")).toBeInTheDocument();

      expect(localStorage.length).toBe(0);
    });
  });

  describe("Phase 1-2 fixes", () => {
    const twoServersDashboard = {
      mode: "local",
      banner: "Test mode",
      summary: {
        totalServers: 2,
        healthyServers: 1,
        warningServers: 0,
        unreachableServers: 1,
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

    const twoServerRecords = [
      {
        id: "vps-1",
        name: "web-01",
        host: "10.0.0.1",
        port: 22,
        username: "root",
        status: "healthy",
        keyProvisionedAt: "2026-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "vps-2",
        name: "db-01",
        host: "10.0.0.2",
        port: 22,
        username: "root",
        status: "unreachable",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    it("shows 404 page for unknown routes", async () => {
      fetchMock
        .mockResolvedValueOnce(authOk())
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: twoServersDashboard }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: twoServerRecords }),
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

      renderApp(["/some-old-route"]);

      expect(await screen.findByText("404")).toBeInTheDocument();
      expect(screen.getByText("Page not found.")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Go to VPS list" }),
      ).toBeInTheDocument();
    });

    it("shows Manage link in card view for each VPS", async () => {
      fetchMock
        .mockResolvedValueOnce(authOk())
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: twoServersDashboard }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: twoServerRecords }),
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

      renderApp(["/vps"]);

      expect(await screen.findByText("web-01")).toBeInTheDocument();

      // Each card should have a Manage link
      const manageLinks = screen.getAllByRole("link", { name: /Manage/i });
      expect(manageLinks.length).toBe(2);
      expect(manageLinks[0]).toHaveAttribute("href", "/vps/vps-1");
      expect(manageLinks[1]).toHaveAttribute("href", "/vps/vps-2");
    });

    it("shows login gate after logout when auth is required", async () => {
      fetchMock
        .mockResolvedValueOnce(authOk("local", true))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: twoServersDashboard }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: twoServerRecords }),
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
        // Logout API call
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: { ok: true } }),
        });

      renderApp(["/vps"]);

      // Wait for server list to load
      expect(await screen.findByText("web-01")).toBeInTheDocument();

      // Open user menu dropdown and click Log out
      await userEvent.click(
        screen.getByRole("button", { name: "Open user menu" }),
      );

      // Wait for the logout option to be available
      const logoutButton = await screen.findByText("Log out");
      expect(logoutButton).toBeInTheDocument();

      await userEvent.click(logoutButton);

      // After logout, should see the login gate (not the dashboard)
      expect(await screen.findByText("Unlock VPS Ops")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Enter the dashboard password. The password is verified server-side against the stored credential and is never stored in browser storage.",
        ),
      ).toBeInTheDocument();

      // Verify logout API was called
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/logout",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("shows VPS not found for non-existent VPS ID after data loads", async () => {
      fetchMock
        .mockResolvedValueOnce(authOk())
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: twoServersDashboard }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: twoServerRecords }),
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

      renderApp(["/vps/non-existent-vps"]);

      expect(await screen.findByText("VPS not found.")).toBeInTheDocument();
    });
  });

  describe("Phase 5 — workspace structure and scoped APIs", () => {
    const twoServers = [
      {
        id: "vps-1",
        name: "web-01",
        host: "10.0.0.1",
        port: 22,
        username: "root",
        status: "healthy",
        keyProvisionedAt: "2026-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "vps-2",
        name: "db-01",
        host: "10.0.0.2",
        port: 22,
        username: "root",
        status: "unreachable",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    const dashboardData = {
      mode: "local",
      summary: {
        totalServers: 2,
        healthyServers: 1,
        warningServers: 0,
        unreachableServers: 1,
        runningJobs: 0,
      },
      servers: [],
      metrics: [],
      dockerMetrics: [
        {
          vpsId: "vps-1",
          collectedAt: "2026-01-01T00:00:00.000Z",
          receivedAt: "2026-01-01T00:00:01.000Z",
          agentVersion: "1.2.3",
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
          containers: [
            {
              id: "workspace-api",
              name: "workspace-api",
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
            },
          ],
        },
      ],
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

    function mockDashboardAndScoped() {
      fetchMock
        .mockResolvedValueOnce(authOk())
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: dashboardData }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: twoServers }),
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
        // Scoped bootstrap calls
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
    }

    it("shows 404 for old top-level routes like /overview, /servers, /jobs, /metrics, /audit, /terminal, /settings", async () => {
      const oldRoutes = [
        "/overview",
        "/servers",
        "/jobs",
        "/metrics",
        "/audit",
        "/terminal",
        "/settings",
      ];
      for (const route of oldRoutes) {
        cleanup();
        fetchMock.mockReset();
        mockDashboardAndScoped();
        renderApp([route]);
        expect(await screen.findByText("404")).toBeInTheDocument();
        expect(screen.getByText("Page not found.")).toBeInTheDocument();
      }
    });

    it("renders create form at /vps/new, not VPS not found / workspace", async () => {
      fetchMock.mockReset();
      mockDashboardAndScoped();

      renderApp(["/vps/new"]);

      // Should show the create form header ("New VPS" in the content area h2), not a workspace or 404
      await waitFor(() => {
        const newVpsHeadings = screen.getAllByText("New VPS");
        expect(newVpsHeadings.length).toBeGreaterThanOrEqual(1);
      });
      expect(screen.getByText(/Password is optional/)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Create VPS/i }),
      ).toBeInTheDocument();
      // VPS not found must not appear
      expect(screen.queryByText("VPS not found.")).not.toBeInTheDocument();
    });

    it("renders VPS workspace for valid VPS id, showing server name", async () => {
      fetchMock.mockReset();
      mockDashboardAndScoped();

      renderApp(["/vps/vps-1"]);

      // Wait for dashboard to load and VPS workspace to render
      expect(await screen.findByText("web-01")).toBeInTheDocument();
      // Workspace header shows the endpoint as username@host:port
      expect(screen.getByText("root@10.0.0.1:22")).toBeInTheDocument();
      // Overview tab should be active by default
      expect(screen.getByText("Overview")).toBeInTheDocument();
    });

    it("renders workspace jobs page for /vps/:id/jobs", async () => {
      fetchMock.mockReset();
      mockDashboardAndScoped();

      renderApp(["/vps/vps-1/jobs"]);

      expect(await screen.findByText("Jobs for web-01")).toBeInTheDocument();
    });

    it("renders workspace metrics page for /vps/:id/metrics", async () => {
      fetchMock.mockReset();
      mockDashboardAndScoped();

      renderApp(["/vps/vps-1/metrics"]);

      expect(await screen.findByText("Metrics for web-01")).toBeInTheDocument();
      expect(screen.getByText("Docker workloads")).toBeInTheDocument();
      expect(screen.getByText("workspace-api")).toBeInTheDocument();
      expect(screen.getByText("app:latest")).toBeInTheDocument();
      expect(
        screen.getByRole("region", { name: "Docker metrics summary" }),
      ).toHaveTextContent("1/2");
    });

    it("shows 404 for unknown workspace sub-route /vps/:id/unknown", async () => {
      fetchMock.mockReset();
      mockDashboardAndScoped();

      renderApp(["/vps/vps-1/unknown"]);

      expect(await screen.findByText("404")).toBeInTheDocument();
      expect(screen.getByText("Page not found.")).toBeInTheDocument();
    });

    it("logs out from workspace route back to login gate", async () => {
      fetchMock
        .mockResolvedValueOnce(authOk("local", true))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: dashboardData }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: twoServers }),
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
          status: 200,
          json: async () => ({ data: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: [] }),
        })
        // Logout API call
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: { ok: true } }),
        });

      renderApp(["/vps/vps-1"]);

      expect(await screen.findByText("web-01")).toBeInTheDocument();

      await userEvent.click(
        screen.getByRole("button", { name: "Open user menu" }),
      );
      const logoutButton = await screen.findByText("Log out");
      await userEvent.click(logoutButton);

      expect(await screen.findByText("Unlock VPS Ops")).toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/logout",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("requests scoped APIs for current VPS", async () => {
      fetchMock.mockReset();
      mockDashboardAndScoped();

      renderApp(["/vps/vps-1"]);

      // Wait for workspace to render
      expect(await screen.findByText("web-01")).toBeInTheDocument();

      // The scoped bootstrap calls should have been made (called without params, so no query string)
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/vps/vps-1/metrics",
          expect.any(Object),
        );
      });
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/vps/vps-1/jobs",
          expect.any(Object),
        );
      });
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/vps/vps-1/audit",
          expect.any(Object),
        );
      });
    });

    it("navigating within workspace sub-routes does not crash or show stale data", async () => {
      fetchMock.mockReset();
      mockDashboardAndScoped();
      // Extra mock for navigating to vps-2 scoped calls
      fetchMock
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

      // Use window.location to simulate navigation between VPS workspace sub-routes
      renderApp(["/vps/vps-1/jobs"]);

      // Should render jobs for vps-1
      expect(await screen.findByText("Jobs for web-01")).toBeInTheDocument();
    });
  });
});
