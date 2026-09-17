import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DockerMetricsPanel, dockerSnapshotState } from "./DockerMetricsPanel";
import type { DashboardDockerContainerMetric, DashboardDockerMetrics, VpsRecord } from "../../../lib/api";

const vps = { id: "vps-1", name: "web-01", host: "example.test", port: 22, username: "root", dockerMetricsEnabled: true, createdAt: "", updatedAt: "" } as VpsRecord;
const container = (name: string, image: string, state = "running", cpuPercent = 1, memoryUsageBytes = 1024): DashboardDockerContainerMetric => ({ id: name, name, image, state, status: state, cpuPercent, memoryUsageBytes, networkRxBytes: 0, networkTxBytes: 0, blockReadBytes: 0, blockWriteBytes: 0, pids: 1 });
const metric = (overrides: Partial<DashboardDockerMetrics> = {}): DashboardDockerMetrics => ({ vpsId: "vps-1", collectedAt: "2026-01-01T00:00:00Z", receivedAt: new Date().toISOString(), schemaVersion: 1, available: true, containerTotal: 1, containerRunning: 1, cpuPercent: 1, memoryUsageBytes: 1024, networkRxBytes: 0, networkTxBytes: 0, blockReadBytes: 0, blockWriteBytes: 0, pids: 1, containers: [container("api", "app:latest")], ...overrides });
const view = (dockerMetrics?: DashboardDockerMetrics, record = vps) => render(<DockerMetricsPanel vps={record} dockerMetrics={dockerMetrics} busy={false} onToggle={vi.fn()} />);

afterEach(cleanup);

describe("DockerMetricsPanel freshness", () => {
  it("derives missing freshness with conservative 120 second semantics", () => {
    const now = Date.parse("2026-06-01T12:00:00Z");
    expect(dockerSnapshotState(metric({ freshness: undefined, receivedAt: new Date(now - 119_999).toISOString() }), now)).toBe("live");
    expect(dockerSnapshotState(metric({ freshness: undefined, receivedAt: new Date(now - 120_000).toISOString() }), now)).toBe("stale");
    expect(dockerSnapshotState(metric({ freshness: undefined, receivedAt: "2026-06-01T11:57:59Z" }), now)).toBe("stale");
    expect(dockerSnapshotState(metric({ freshness: undefined, receivedAt: "2026-06-01T12:00:01Z" }), now)).toBe("unknown");
    expect(dockerSnapshotState(metric({ freshness: undefined, receivedAt: "invalid" }), now)).toBe("unknown");
    expect(dockerSnapshotState(metric({ freshness: undefined, receivedAt: "" }), now)).toBe("unknown");
  });
  it("never labels an old legacy snapshot live", () => { view(metric({ freshness: undefined, receivedAt: "2020-01-01T00:00:00Z" })); expect(screen.getByText("Saved snapshot · not live")).toBeInTheDocument(); expect(screen.queryByText("Live snapshot")).not.toBeInTheDocument(); });
  it("labels future, invalid, and missing legacy timestamps unknown and not live", () => { const { rerender } = view(metric({ freshness: undefined, receivedAt: "2999-01-01T00:00:00Z" })); expect(screen.getByText(/freshness unknown · not live/)).toBeInTheDocument(); rerender(<DockerMetricsPanel vps={vps} dockerMetrics={metric({ freshness: undefined, receivedAt: "invalid" })} busy={false} onToggle={vi.fn()} />); expect(screen.getByText(/freshness unknown · not live/)).toBeInTheDocument(); rerender(<DockerMetricsPanel vps={vps} dockerMetrics={metric({ freshness: undefined, receivedAt: "" })} busy={false} onToggle={vi.fn()} />); expect(screen.getByText(/freshness unknown · not live/)).toBeInTheDocument(); expect(screen.queryByText("Live snapshot")).not.toBeInTheDocument(); });
});

describe("DockerMetricsPanel details", () => {
  it("uses authoritative totals and scopes search to retained details", () => { view(metric({ freshness: "stale", containerTotal: 27, containers: [container("api", "app:latest"), container("worker", "jobs:latest", "exited")] })); expect(screen.getByText("Showing 2 detail rows of 27 reported containers")).toBeInTheDocument(); expect(screen.getByText(/Search and filters cover 2 retained detail rows; 25 reported containers/)).toBeInTheDocument(); fireEvent.change(screen.getByRole("searchbox"), { target: { value: "api" } }); expect(screen.getByText("1 matches in details")).toBeInTheDocument(); });
  it("filters unhealthy containers and sorts CPU descending", () => { view(metric({ freshness: "fresh", containerTotal: 3, containers: [container("low", "a", "running", 1), container("broken", "b", "running", 2), container("high", "c", "running", 9)] })); fireEvent.change(screen.getByLabelText("Sort containers"), { target: { value: "cpu" } }); const rows = screen.getAllByRole("listitem"); expect(within(rows[0]).getByText("high")).toBeInTheDocument(); fireEvent.change(screen.getByLabelText("Filter containers"), { target: { value: "unhealthy" } }); expect(screen.getByText("No containers match this view.")).toBeInTheDocument(); });
  it("shows friendly known and unknown errors and preserves privacy copy", () => { const unavailable = metric({ available: false, errorCode: "permission_denied", containers: [] }); const { rerender } = view(unavailable); expect(screen.getByText(/does not have permission/)).toBeInTheDocument(); rerender(<DockerMetricsPanel vps={vps} dockerMetrics={metric({ available: false, errorCode: "new_error", containers: [] })} busy={false} onToggle={vi.fn()} />); expect(screen.getByText("Docker metrics are unavailable right now.")).toBeInTheDocument(); rerender(<DockerMetricsPanel vps={{ ...vps, dockerMetricsEnabled: false }} busy={false} onToggle={vi.fn()} />); fireEvent.click(screen.getByRole("button", { name: /Enable Docker metrics/ })); expect(screen.getByText(/Environment variables, logs, mounts, labels, and commands are not collected/)).toBeInTheDocument(); });
});
