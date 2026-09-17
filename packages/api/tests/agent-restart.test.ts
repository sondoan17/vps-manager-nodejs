import { spawnSync } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import { AgentLifecycleCoordinator } from "../src/agents/agent-lifecycle-coordinator.js";
import {
  AgentRestartService,
  buildRestartInspectCommand,
  buildRestartStartCommand,
  buildRestartStopCommand,
} from "../src/agents/agent-restart.service.js";
import {
  buildLifecycleLockAcquireCommand,
  buildLifecycleLockReleaseCommand,
} from "../src/agents/agent-lifecycle-remote.js";
import type { AgentState } from "../src/agents/agent.models.js";
import type { AppConfig } from "../src/config/app-config.js";

function bashPath(): string | undefined {
  const candidates = process.platform === "win32"
    ? [
        "C:\\Program Files\\Git\\bin\\bash.exe",
        "C:\\Program Files\\Git\\usr\\bin\\bash.exe",
        "C:\\Program Files (x86)\\Git\\bin\\bash.exe",
        "C:\\Program Files (x86)\\Git\\usr\\bin\\bash.exe",
      ]
    : ["bash"];
  if (process.platform === "win32") {
    const located = spawnSync("where.exe", ["bash"], { encoding: "utf8" });
    if (!located.error && located.status === 0) {
      candidates.push(...located.stdout.split(/\r?\n/).filter(Boolean));
    }
  }
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ["-n", "-c", ":"], { stdio: "ignore" });
    if (!result.error && result.status === 0) return candidate;
  }
  return undefined;
}

function assertBashSyntax(command: string): void {
  const bash = bashPath();
  if (!bash) return;
  const result = spawnSync(bash, ["-n", "-c", command], { encoding: "utf8" });
  expect(result.status, result.stderr).toBe(0);
}

function fixture(options: {
  state?: AgentState | undefined;
  keyProvisioned?: boolean;
  keyError?: boolean;
  inspect?: string;
  observations?: AgentState[];
  startError?: Error;
} = {}) {
  const vps = { id: "vps-1", name: "remote", host: "203.0.113.2", port: 22, username: "root",
    keyProvisionedAt: options.keyProvisioned === false ? undefined : "2026-01-01T00:00:00Z" };
  const initial = options.state === undefined
    ? { vpsId: vps.id, status: "online", version: "1.0.0", lastSeenAt: "2026-01-01T00:00:00.000Z" } as AgentState
    : options.state;
  const observations = [...(options.observations ?? [])];
  const agents = { getState: vi.fn(async () => observations.shift() ?? initial), upsertState: vi.fn() };
  const commands: string[] = [];
  const execCommandStrict = vi.fn(async (_vps: unknown, command: string) => {
    commands.push(command);
    if (command.includes("$HOME")) return { stdout: "/home/deploy\n", stderr: "" };
    if (command.includes("mkdir --") && command.includes("lifecycle.lock")) return { stdout: "acquired", stderr: "" };
    if (command.includes("_matches=0")) return { stdout: options.inspect ?? "owned:42:9001\n", stderr: "" };
    if (options.startError && command.includes("nohup")) throw options.startError;
    return { stdout: "", stderr: "" };
  });
  const ssh = { execCommandStrict };
  let task: ((ctx: any) => Promise<void>) | undefined;
  const runner = { start: vi.fn((_job, next) => { task = next; }) };
  const jobs = { create: vi.fn(async () => ({ id: "job-1", vpsId: vps.id, type: "restart-agent", status: "queued", progress: 0 })) };
  const audit = { record: vi.fn(async (_event: any) => undefined) };
  const lifecycle = new AgentLifecycleCoordinator();
  const service = new AgentRestartService(
    { mode: "local", agentInstallIntervalSeconds: 30 } as AppConfig,
    ssh as any, agents as any, { get: vi.fn(async () => vps) } as any,
    { readPrivateKey: vi.fn(async () => { if (options.keyError) throw new Error("private key secret"); return "PRIVATE-KEY-SECRET"; }) } as any,
    audit as any, runner as any, jobs as any, lifecycle,
    { intervalMs: 1, timeoutMs: 3, sleep: async () => undefined },
  );
  const ctx = { update: vi.fn(async () => undefined), succeed: vi.fn(async () => undefined) };
  return { service, run: async () => task!(ctx), agents, audit, commands, lifecycle, ctx };
}

describe("AgentRestartService", () => {
  it("builds fixed, quoted ownership commands for the managed paths", () => {
    const binary = "/home/o'hare/.vps-manager-agent/vps-agent";
    const config = "/home/o'hare/.vps-manager-agent/config.json";
    const pid = "/home/o'hare/.vps-manager-agent/vps-agent.pid";
    for (const command of [buildRestartInspectCommand(binary, config, pid), buildRestartStopCommand(binary, config, pid), buildRestartStartCommand(binary, config, pid)]) {
      expect(command).toContain(`'"'"'`);
      expect(command).not.toContain("pkill");
    }
  });

  it("builds a transactional launcher whose trap covers publication and cleans only its artifacts", () => {
    const command = buildRestartStartCommand("/opt/agent", "/opt/config.json", "/run/agent.pid");
    const spawn = command.indexOf("nohup");
    const trap = command.indexOf("trap 'cleanup' EXIT");
    const initialVerification = command.indexOf("sleep .2");
    const publication = command.indexOf('mv -- "$_tmp" "$_pf"');
    const finalVerification = command.lastIndexOf('kill -0 "$_pid"');
    const disarm = command.lastIndexOf("trap - EXIT HUP INT TERM");
    expect(spawn).toBeGreaterThan(-1);
    expect(trap).toBeLessThan(spawn);
    expect(initialVerification).toBeGreaterThan(spawn);
    expect(publication).toBeGreaterThan(initialVerification);
    expect(finalVerification).toBeGreaterThan(publication);
    expect(disarm).toBeGreaterThan(finalVerification);
    expect(command).toContain('test "$(st "$_pid")" = "$_start"');
    const cleanup = command.slice(command.indexOf("cleanup(){"), spawn);
    expect(cleanup).toContain("if same_spawn");
    expect(cleanup).toContain("while same_spawn");
    expect(cleanup).not.toContain("if owns_new");
    expect(command.slice(initialVerification, publication)).toContain("owns_new");
    expect(command.slice(publication, disarm)).toContain("owns_new");
    expect(command).toContain('$_pf.tmp.$_pid.$_start');
    expect(command).toContain('[ "$(cat "$_pf" 2>/dev/null)" = "$_pid" ]');
    expect(command).not.toContain('rm -f -- "$_pf"; exit');
    expect(command).not.toContain("mv -f");
  });

  it("rejects missing key and not-installed state and releases lifecycle", async () => {
    const noKey = fixture({ keyProvisioned: false });
    await expect(noKey.service.restart("vps-1")).rejects.toThrow(/provisioned SSH key/i);
    const release = await noKey.lifecycle.tryAcquire("vps-1", "restart"); release();

    const notInstalled = fixture({ state: { vpsId: "vps-1", status: "not_installed" } });
    await expect(notInstalled.service.restart("vps-1")).rejects.toThrow(/installed agent/i);

    const missingKey = fixture({ keyError: true });
    await expect(missingKey.service.restart("vps-1")).rejects.toThrow(/private key not found/i);
  });

  it("blocks concurrent lifecycle work and succeeds only after a newer same-version heartbeat", async () => {
    const fresh = { vpsId: "vps-1", status: "online", version: "1.0.0", lastSeenAt: "2999-01-01T00:00:00.000Z" } as AgentState;
    const current = { vpsId: "vps-1", status: "online", version: "1.0.0", lastSeenAt: "2026-01-01T00:00:01.000Z" } as AgentState;
    const baseline = { vpsId: "vps-1", status: "online", version: "1.0.0", lastSeenAt: "2026-01-01T00:00:02.000Z" } as AgentState;
    const f = fixture({ observations: [current, baseline, fresh] });
    await f.service.restart("vps-1");
    await expect(f.lifecycle.tryAcquire("vps-1", "upgrade")).rejects.toThrow(/already in progress/i);
    await f.run();
    expect(f.ctx.succeed).toHaveBeenCalledWith("complete");
    expect(f.agents.upsertState).not.toHaveBeenCalled();
    const start = f.audit.record.mock.calls.find(([event]) => event.action === "agent.restart.start")?.[0];
    const success = f.audit.record.mock.calls.find(([event]) => event.action === "agent.restart.success")?.[0];
    expect(JSON.stringify([start, success])).not.toContain("PRIVATE-KEY-SECRET");
  });

  it("rejects equal, pre-stop, and wrong-version heartbeats and releases the remote lock", async () => {
    const baseline = { vpsId: "vps-1", status: "online", version: "1.0.0", lastSeenAt: "2026-01-01T00:00:02.000Z" } as AgentState;
    const f = fixture({ observations: [baseline, baseline, { ...baseline, version: "9.9.9", lastSeenAt: "2999-01-01T00:00:00.000Z" }] });
    await f.service.restart("vps-1");
    await expect(f.run()).rejects.toThrow(/Timed out/i);
    expect(f.commands.some((command) => command.includes("rmdir --") && command.includes("lifecycle.lock"))).toBe(true);
  });

  it("rejects PID ownership mismatch without signaling or starting", async () => {
    const f = fixture({ inspect: "mismatch" });
    await f.service.restart("vps-1");
    await expect(f.run()).rejects.toThrow(/ownership/i);
    expect(f.commands.some((command) => command.includes("kill -TERM"))).toBe(false);
    expect(f.commands.some((command) => command.includes("nohup"))).toBe(false);
  });

  it("accepts a missing PID and times out without mutating agent state", async () => {
    const f = fixture({ inspect: "none" });
    await f.service.restart("vps-1");
    await expect(f.run()).rejects.toThrow(/Timed out/i);
    expect(f.commands.some((command) => command.includes("nohup"))).toBe(true);
    expect(f.agents.upsertState).not.toHaveBeenCalled();
    const failure = f.audit.record.mock.calls.find(([event]) => event.action === "agent.restart.failure")?.[0];
    expect(failure?.metadata).toEqual({ jobId: "job-1", error: "Timed out waiting for restarted agent observation" });
  });

  it("redacts secrets from asynchronous failure audit data", async () => {
    const f = fixture({ inspect: "none", startError: new Error("token=SUPER-SECRET launch failed") });
    await f.service.restart("vps-1");
    await expect(f.run()).rejects.not.toThrow(/SUPER-SECRET/);
    const failure = f.audit.record.mock.calls.find(([event]) => event.action === "agent.restart.failure")?.[0];
    expect(JSON.stringify(failure)).not.toContain("SUPER-SECRET");
    expect(failure?.metadata.error).toContain("[REDACTED]");
  });

  it("generates Bash-valid lifecycle commands (regression: function definitions need `};` separators)", () => {
    const binary = "/home/deploy/.vps-manager-agent/vps-agent";
    const config = "/home/deploy/.vps-manager-agent/config.json";
    const pidFile = "/home/deploy/.vps-manager-agent/vps-agent.pid";
    const commands = [
      buildLifecycleLockAcquireCommand(`${binary}.lock`),
      buildLifecycleLockReleaseCommand(`${binary}.lock`),
      buildRestartInspectCommand(binary, config, pidFile),
      buildRestartStopCommand(binary, config, "42", "9001"),
      buildRestartStartCommand(binary, config, pidFile),
    ];
    for (const command of commands) assertBashSyntax(command);
    // Exact regression shape: the st() helper must terminate with `};`
    // so the following `for`/function token parses under Bash.
    for (const command of commands) {
      expect(command).not.toMatch(/\}\sfor\s/);
      expect(command).not.toMatch(/\}\sif\s/);
      expect(command).not.toMatch(/\}\s[a-zA-Z_][a-zA-Z0-9_]*\(\)\{/);
    }
    expect(buildRestartInspectCommand(binary, config, pidFile)).toContain("}; for _d");
  });
});
