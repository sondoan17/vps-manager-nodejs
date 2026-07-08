import { readFileSync, statfsSync } from "node:fs";
import * as os from "node:os";
import type { MetricSample } from "../metrics/metrics.models.js";

// ── Types ─────────────────────────────────────────────────────────────────

export type SystemMetrics = {
  cpu: number;
  memory: number;
  disk: number;
  loadAverage: number;
  networkRx: number;
  networkTx: number;
  uptime: number;
};

// ── CPU delta tracking ────────────────────────────────────────────────────

let previousCpuTimes: os.CpuInfo[] | null = null;
let previousCpuIdle = 0;
let previousCpuTotal = 0;

function getCpuUsage(): number {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;

  for (const cpu of cpus) {
    for (const type of Object.keys(
      cpu.times,
    ) as (keyof os.CpuInfo["times"])[]) {
      total += cpu.times[type];
    }
    idle += cpu.times.idle;
  }

  if (previousCpuTimes) {
    const idleDelta = idle - previousCpuIdle;
    const totalDelta = total - previousCpuTotal;
    if (totalDelta > 0) {
      const usage = 100 - (idleDelta / totalDelta) * 100;
      previousCpuTimes = cpus;
      previousCpuIdle = idle;
      previousCpuTotal = total;
      return Math.min(100, Math.max(0, Math.round(usage * 10) / 10));
    }
  }

  previousCpuTimes = cpus;
  previousCpuIdle = idle;
  previousCpuTotal = total;
  return 0;
}

// ── Linux /proc readers ───────────────────────────────────────────────────

function readProcFile(path: string): string | null {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function getLinuxCpuUsage(): number {
  const content = readProcFile("/proc/stat");
  if (!content) return getCpuUsage(); // fallback to os.cpus() delta

  const lines = content.split("\n");
  const cpuLine = lines.find((l) => l.startsWith("cpu "));
  if (!cpuLine) return getCpuUsage();

  const parts = cpuLine.trim().split(/\s+/).slice(1).map(Number);
  if (parts.length < 4) return getCpuUsage();

  // parts: user, nice, system, idle, iowait, irq, softirq, steal
  const idle = parts[3] + (parts[4] ?? 0);
  const total = parts.reduce((a: number, b: number) => a + b, 0);

  if (previousCpuTotal > 0) {
    const idleDelta = idle - previousCpuIdle;
    const totalDelta = total - previousCpuTotal;
    if (totalDelta > 0) {
      const usage = 100 - (idleDelta / totalDelta) * 100;
      previousCpuIdle = idle;
      previousCpuTotal = total;
      return Math.min(100, Math.max(0, Math.round(usage * 10) / 10));
    }
  }

  previousCpuIdle = idle;
  previousCpuTotal = total;
  return 0;
}

function getLinuxMemory(): number {
  const content = readProcFile("/proc/meminfo");
  if (!content) {
    // Fallback to os module
    const total = os.totalmem();
    const free = os.freemem();
    return total > 0 ? Math.round(((total - free) / total) * 1000) / 10 : 0;
  }

  let total = 0;
  let available = 0;

  for (const line of content.split("\n")) {
    if (line.startsWith("MemTotal:")) {
      total = parseInt(line.split(/\s+/)[1] ?? "0", 10);
    }
    if (line.startsWith("MemAvailable:")) {
      available = parseInt(line.split(/\s+/)[1] ?? "0", 10);
    }
  }

  if (total > 0) {
    return Math.round(((total - available) / total) * 1000) / 10;
  }
  return 0;
}

function getLinuxLoadAverage(): number {
  const content = readProcFile("/proc/loadavg");
  if (!content) return os.loadavg()[0] ?? 0;
  return parseFloat(content.split(" ")[0] ?? "0");
}

function getLinuxUptime(): number {
  const content = readProcFile("/proc/uptime");
  if (!content) return os.uptime();
  return parseFloat(content.split(" ")[0] ?? "0");
}

function getLinuxNetwork(): { rx: number; tx: number } {
  const content = readProcFile("/proc/net/dev");
  if (!content) return { rx: 0, tx: 0 };

  let rx = 0;
  let tx = 0;
  const lines = content.split("\n");
  // Skip header lines (first 2)
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const iface = line.slice(0, line.indexOf(":")).trim();
    if (iface === "lo") continue;
    const parts = line.split(/\s+/);
    if (parts.length >= 10) {
      rx += parseInt(parts[1] ?? "0", 10);
      tx += parseInt(parts[9] ?? "0", 10);
    }
  }
  return { rx, tx };
}

// ── Platform detection ────────────────────────────────────────────────────

const isLinux = process.platform === "linux";

// ── Main collector ────────────────────────────────────────────────────────

/**
 * Collect system metrics from the local machine.
 * Uses /proc filesystem on Linux for more accurate data,
 * falls back to node:os module for cross-platform support.
 *
 * Call repeatedly to get delta-based CPU usage.
 */
export function collectSystemMetrics(): SystemMetrics {
  // CPU
  const cpu = isLinux ? getLinuxCpuUsage() : getCpuUsage();

  // Memory
  let memory: number;
  if (isLinux) {
    memory = getLinuxMemory();
  } else {
    const total = os.totalmem();
    const free = os.freemem();
    memory = total > 0 ? Math.round(((total - free) / total) * 1000) / 10 : 0;
  }

  // Disk (0 on non-Linux since node:fs.statfs is experimental)
  let disk = 0;
  if (isLinux) {
    try {
      const stats = statfsSync("/");
      const total = stats.blocks * stats.bsize;
      const free = stats.bfree * stats.bsize;
      if (total > 0) {
        disk = Math.round(((total - free) / total) * 1000) / 10;
      }
    } catch {
      // Fallback: disk 0
    }
  }

  // Load average
  const loadAverage = isLinux ? getLinuxLoadAverage() : (os.loadavg()[0] ?? 0);

  // Network
  const network = isLinux ? getLinuxNetwork() : { rx: 0, tx: 0 };

  // Uptime
  const uptime = isLinux ? getLinuxUptime() : os.uptime();

  return {
    cpu: Math.min(100, Math.max(0, cpu)),
    memory: Math.min(100, Math.max(0, memory)),
    disk: Math.min(100, Math.max(0, disk)),
    loadAverage: Math.max(0, loadAverage),
    networkRx: network.rx,
    networkTx: network.tx,
    uptime: Math.max(0, uptime),
  };
}

/**
 * Build a MetricSample from local system metrics.
 */
export function buildLocalMetricSample(
  vpsId: string,
  metrics: SystemMetrics,
): MetricSample {
  const now = new Date().toISOString();
  return {
    vpsId,
    cpu: metrics.cpu,
    memory: metrics.memory,
    disk: metrics.disk,
    loadAverage: metrics.loadAverage,
    networkRx: metrics.networkRx,
    networkTx: metrics.networkTx,
    uptime: metrics.uptime,
    collectedAt: now,
    receivedAt: now,
    source: "local-agent",
    agentVersion: "0.1.0-local",
  };
}

/**
 * Reset CPU tracking state (useful for testing).
 */
export function resetCpuTracking(): void {
  previousCpuTimes = null;
  previousCpuIdle = 0;
  previousCpuTotal = 0;
}
