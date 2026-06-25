import type { AuditEvent } from "../models/audit.js";
import type { DashboardJob, DashboardMetricSample, DemoTerminalOverview } from "../models/dashboard.js";
import type { VpsRecord } from "../models/vps.js";

const DEMO_TIME = "2026-06-24T12:00:00.000Z";

export const DEMO_BANNER = "Demo mode: simulated servers, no real SSH connections.";

export const demoServers: readonly VpsRecord[] = [
  {
    id: "demo-edge-sgp-01",
    name: "edge-sgp-01",
    host: "demo-edge.internal",
    port: 22,
    username: "deploy",
    provider: "DemoCloud",
    region: "Singapore",
    tags: ["edge", "nginx"],
    status: "healthy",
    lastSeenAt: DEMO_TIME,
    notes: "Public edge node with simulated uptime.",
    keyProvisionedAt: DEMO_TIME,
    createdAt: "2026-06-20T08:00:00.000Z",
    updatedAt: DEMO_TIME
  },
  {
    id: "demo-api-fra-02",
    name: "api-fra-02",
    host: "demo-api.internal",
    port: 22,
    username: "deploy",
    provider: "DemoCloud",
    region: "Frankfurt",
    tags: ["api", "nodejs"],
    status: "warning",
    lastSeenAt: "2026-06-24T11:57:00.000Z",
    notes: "Simulated elevated load for dashboard review.",
    keyProvisionedAt: DEMO_TIME,
    createdAt: "2026-06-19T08:00:00.000Z",
    updatedAt: DEMO_TIME
  },
  {
    id: "demo-worker-sfo-01",
    name: "worker-sfo-01",
    host: "demo-worker.internal",
    port: 22,
    username: "deploy",
    provider: "DemoCloud",
    region: "San Francisco",
    tags: ["worker", "queue"],
    status: "unreachable",
    lastSeenAt: "2026-06-24T10:40:00.000Z",
    notes: "Simulated unreachable worker for incident states.",
    createdAt: "2026-06-18T08:00:00.000Z",
    updatedAt: DEMO_TIME
  }
] as const;

export const demoMetrics: readonly DashboardMetricSample[] = [
  { vpsId: "demo-edge-sgp-01", cpu: 24, memory: 43, disk: 61, loadAverage: 0.41, networkRx: 128_400, networkTx: 93_200, uptime: 691_200, collectedAt: DEMO_TIME, freshness: "fresh", trend: { range: "1h", points: [18, 28, 22, 24, 30, 26], min: 18, max: 30, threshold: 90, unit: "cpu" } },
  { vpsId: "demo-api-fra-02", cpu: 72, memory: 78, disk: 68, loadAverage: 2.18, networkRx: 284_900, networkTx: 201_300, uptime: 432_000, collectedAt: "2026-06-24T11:57:00.000Z", freshness: "fresh", trend: { range: "1h", points: [62, 68, 72, 78, 75, 80], min: 62, max: 80, threshold: 80, unit: "memory" } },
  { vpsId: "demo-worker-sfo-01", cpu: 0, memory: 0, disk: 74, loadAverage: 0, networkRx: 0, networkTx: 0, uptime: 0, collectedAt: "2026-06-24T10:40:00.000Z", freshness: "stale", trend: { range: "2h", points: [68, 70, 72, 74, 74, 73], min: 68, max: 74, threshold: 85, unit: "disk" } }
] as const;

export const demoJobs: readonly DashboardJob[] = [
  { id: "job_demo_disk_check", vpsId: "demo-worker-sfo-01", type: "check disk usage", status: "queued", progress: 0, workerId: "worker-queue-01", retryCount: 0, outputPreview: "Waiting for the active metrics collection to finish." },
  { id: "job_demo_collect_metrics", vpsId: "demo-edge-sgp-01", type: "collect metrics", status: "running", progress: 64, startedAt: "2026-06-24T11:59:30.000Z", workerId: "worker-metrics-01", durationMs: 14_200, outputPreview: "Collecting uptime, disk, and load averages..." },
  { id: "job_demo_verify_key", vpsId: "demo-api-fra-02", type: "verify key", status: "succeeded", progress: 100, startedAt: "2026-06-24T11:55:00.000Z", finishedAt: "2026-06-24T11:55:03.000Z", exitCode: 0, workerId: "worker-crypto-02", durationMs: 3_200, retryCount: 1, outputPreview: "Key verification succeeded." }
] as const;

export const demoAuditEvents: readonly AuditEvent[] = [
  { id: "audit_demo_dashboard_view", actor: "demo", action: "demo.dashboard.view", resourceType: "dashboard", result: "success", timestamp: DEMO_TIME, severity: "info", actionLabel: "Dashboard viewed", metadata: { mode: "demo" } },
  { id: "audit_demo_job_queued", actor: "system", action: "job.queued", resourceType: "job", resourceId: "job_demo_disk_check", result: "success", timestamp: "2026-06-24T11:59:00.000Z", severity: "info", actionLabel: "Job queued", serverLabel: "worker-sfo-01" },
  { id: "audit_demo_job_running", actor: "system", action: "job.running", resourceType: "job", resourceId: "job_demo_collect_metrics", result: "success", timestamp: "2026-06-24T11:59:30.000Z", severity: "info", actionLabel: "Job started", serverLabel: "edge-sgp-01" },
  { id: "audit_demo_job_succeeded", actor: "system", action: "job.succeeded", resourceType: "job", resourceId: "job_demo_verify_key", result: "success", timestamp: "2026-06-24T11:55:03.000Z", severity: "info", actionLabel: "Job completed", serverLabel: "api-fra-02" },
  { id: "audit_demo_terminal_opened", actor: "demo", action: "terminal.opened", resourceType: "terminal", result: "success", timestamp: "2026-06-24T11:58:00.000Z", severity: "info", actionLabel: "Terminal session", metadata: { mode: "canned-demo" } },
  { id: "audit_demo_host_blocked", actor: "system", action: "ssh.host.blocked", resourceType: "vps", resourceId: "demo-worker-sfo-01", result: "blocked", timestamp: "2026-06-24T10:40:00.000Z", severity: "critical", actionLabel: "SSH host blocked", serverLabel: "worker-sfo-01", metadata: { reason: "simulated unreachable host" } }
] as const;

export const demoTerminal: DemoTerminalOverview = {
  label: "Demo terminal",
  networkAccess: "disabled",
  commands: ["uptime", "df -h", "free -m", "systemctl status nginx", "journalctl -n 20"],
  sessions: [
    { command: "uptime", output: "12:00:00 up 8 days, 4:12, 1 user, load average: 0.41, 0.37, 0.35" },
    { command: "df -h", output: "/dev/vda1   40G   24G   16G  61% /" },
    { command: "free -m", output: "Mem: 1995 total, 858 used, 1137 free" }
  ]
};
