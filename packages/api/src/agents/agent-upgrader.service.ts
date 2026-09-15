import { BadRequestException, ConflictException, Inject, Injectable, Optional } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { AppConfig } from "../config/app-config.js";
import type { AgentRepository } from "../persistence/repositories/agent.repository.js";
import type { VpsRepository } from "../persistence/repositories/vps.repository.js";
import type { KeyService } from "../ssh/keyService.js";
import { SshService } from "../ssh/ssh.service.js";
import { AuditService } from "../audit/audit.service.js";
import { JobRunnerService, sanitiseError, type JobTaskContext } from "../jobs/job-runner.service.js";
import { JobService } from "../jobs/job.service.js";
import { AgentLifecycleCoordinator } from "./agent-lifecycle-coordinator.js";
import type { AgentState } from "./agent.models.js";
import type { VpsRecord } from "../vps/vps.models.js";
import { APP_CONFIG, AGENT_REPOSITORY, VPS_REPOSITORY, KEY_SERVICE } from "../tokens.js";
import { VpsNotFoundError } from "../common/errors.js";

const DIR = ".vps-manager-agent";
const VERSION_RE = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/;
export type AgentUpgradePolling = {
  intervalMs: number;
  timeoutMs: number;
  sleep(ms: number): Promise<void>;
};
const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
function q(value: string) { return `'${value.replace(/'/g, `'"'"'`)}'`; }
function validHome(value: string) {
  return value.startsWith("/") && value !== "/" && !/[\r\n\0]/.test(value) &&
    value.split("/").slice(1).every((part) => part.length > 0 && part !== "." && part !== "..");
}

@Injectable()
export class AgentUpgraderService {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(SshService) private readonly ssh: SshService,
    @Inject(AGENT_REPOSITORY) private readonly agents: AgentRepository,
    @Inject(VPS_REPOSITORY) private readonly vpss: VpsRepository,
    @Inject(KEY_SERVICE) private readonly keys: KeyService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(JobRunnerService) private readonly runner: JobRunnerService,
    @Inject(JobService) private readonly jobs: JobService,
    @Inject(AgentLifecycleCoordinator) private readonly lifecycle: AgentLifecycleCoordinator,
    @Optional() private readonly polling?: Partial<AgentUpgradePolling>,
  ) {}

  async upgrade(vpsId: string): Promise<{ jobId: string; state: AgentState }> {
    const release = await this.lifecycle.tryAcquire(vpsId, "upgrade");
    let handedOff = false;
    try {
      const vps = await this.vpss.get(vpsId);
      if (!vps) throw new VpsNotFoundError();
      const state = await this.agents.getState(vpsId);
      if (!state || state.status === "not_installed" || !state.version) {
        throw new BadRequestException("An installed agent is required before upgrade");
      }
      if (!vps.keyProvisionedAt) throw new BadRequestException("Agent upgrade requires a provisioned SSH key");
      let privateKey: string;
      try { privateKey = await this.keys.readPrivateKey(vpsId); }
      catch { throw new BadRequestException("SSH private key not found. Provision the key again."); }
      const binaryPath = this.binaryPath();
      const candidate = readFileSync(binaryPath);
      const checksum = createHash("sha256").update(candidate).digest("hex");
      const job = await this.jobs.create({ vpsId, type: "upgrade-agent", status: "queued", step: "queued", progress: 0, startedAt: new Date().toISOString() });
      await this.audit.record({ actor: "system", action: "agent.upgrade.start", resourceType: "vps", resourceId: vpsId, result: "success", metadata: { jobId: job.id } }).catch(() => undefined);
      this.runner.start(job, async (ctx) => {
        try {
          const version = await this.run(vps, privateKey, candidate, checksum, state, ctx);
          await this.audit.record({ actor: "system", action: "agent.upgrade.success", resourceType: "vps", resourceId: vpsId, result: "success", metadata: { jobId: job.id, version } });
          await ctx.succeed("complete");
        } catch (error) {
          const message = sanitiseError(error);
          await this.audit.record({ actor: "system", action: "agent.upgrade.failure", resourceType: "vps", resourceId: vpsId, result: "failure", metadata: { jobId: job.id, error: message } }).catch(() => undefined);
          throw error;
        } finally { release(); }
      });
      handedOff = true;
      return { jobId: job.id, state };
    } finally { if (!handedOff) release(); }
  }

  private async run(vps: VpsRecord, privateKey: string, candidate: Buffer, checksum: string, prior: AgentState, ctx: JobTaskContext) {
    const auth = { privateKey };
    await ctx.update("connecting", 5);
    const home = (await this.ssh.execCommand(vps, "printf '%s\\n' \"$HOME\"", auth, 10_000)).stdout.trim();
    if (!validHome(home)) throw new Error("Invalid remote home directory");
    const dir = `${home}/${DIR}`, binary = `${dir}/vps-agent`, config = `${dir}/config.json`;
    const pidFile = `${dir}/vps-agent.pid`, lock = `${dir}/upgrade.lock`;
    const nonce = randomBytes(12).toString("hex");
    const staged = `${dir}/vps-agent.stage-${nonce}`, backup = `${dir}/vps-agent.backup-${nonce}`;
    const lockResult = await this.ssh.execCommand(vps, `umask 077; mkdir -- ${q(lock)} 2>/dev/null && printf acquired || printf conflict`, auth, 10_000);
    if (lockResult.stdout.trim() !== "acquired") throw new ConflictException("Agent upgrade lock is already held");
    let swapped = false, oldPid = "", candidateVersion = "";
    try {
      await ctx.update("staging", 15);
      await this.ssh.uploadFile(vps, staged, candidate, 0o700, auth);
      await this.ssh.execCommand(vps, `chmod 700 -- ${q(staged)} && test \"$(sha256sum -- ${q(staged)} | cut -d' ' -f1)\" = ${q(checksum)}`, auth, 15_000);
      const versionOut = (await this.ssh.execCommand(vps, `${q(staged)} -version`, auth, 10_000)).stdout.trim();
      if (!VERSION_RE.test(versionOut)) throw new Error("Candidate returned an invalid version");
      candidateVersion = versionOut;
      await ctx.update("validating", 30);
      await this.ssh.execCommand(vps, `${q(staged)} -config ${q(config)} -once`, auth, 45_000);
      // The staged -once uses the live credential/config and can itself ingest.
      // Snapshot only after it finishes so that observation cannot prove the
      // subsequently started background process is healthy.
      const postPreflightBaseline =
        (await this.agents.getState(vps.id))?.lastSeenAt ?? prior.lastSeenAt;

      await ctx.update("identifying-process", 40);
      const inspect = [
        `_pf=${q(pidFile)}; _bin=${q(binary)}; _cfg=${q(config)};`,
        `_matches=0; _owned=''; for _p in /proc/[0-9]*; do _p=${"${_p##*/}"};`,
        `test \"$(readlink -f /proc/$_p/exe 2>/dev/null)\" = \"$_bin\" || continue;`,
        `_n=$(tr '\\0' '\\n' < /proc/$_p/cmdline 2>/dev/null | awk -v c=\"$_cfg\" 'p==1&&$0==c{n++}{p=($0==\"-config\")}END{print n+0}');`,
        `test \"$_n\" = 1 || continue; _matches=$((_matches+1)); _owned=$_p; done;`,
        `test \"$_matches\" = 1 || { echo ambiguous; exit 0; };`,
        `test -f \"$_pf\" || { echo none; exit 0; }; _pid=$(cat \"$_pf\");`,
        `case \"$_pid\" in (''|*[!0-9]*) echo invalid; exit 0;; esac;`,
        `test \"$(readlink -f /proc/$_pid/exe 2>/dev/null)\" = \"$_bin\" || { echo mismatch; exit 0; };`,
        `_n=$(tr '\\0' '\\n' < /proc/$_pid/cmdline | awk -v c=\"$_cfg\" 'p==1&&$0==c{n++}{p=($0==\"-config\")}END{print n+0}');`,
        `test \"$_n\" = 1 || { echo ambiguous; exit 0; }; test \"$_pid\" = \"$_owned\" || { echo mismatch; exit 0; }; printf 'ok:%s\\n' \"$_pid\"`,
      ].join(" ");
      const ownership = (await this.ssh.execCommand(vps, inspect, auth, 10_000)).stdout.trim();
      if (!/^ok:[1-9][0-9]*$/.test(ownership)) throw new Error("Managed agent process ownership is missing or ambiguous");
      oldPid = ownership.slice(3);
      await ctx.update("stopping", 50);
      await this.stopPid(vps, auth, binary, config, oldPid);
      await ctx.update("swapping", 60);
      await this.ssh.execCommand(vps, `test -f ${q(binary)} && mv -- ${q(binary)} ${q(backup)} && mv -- ${q(staged)} ${q(binary)}`, auth, 10_000);
      swapped = true;
      await this.start(vps, auth, binary, config, pidFile);
      await ctx.update("verifying-ingest", 80);
      await this.waitForObservation(vps.id, postPreflightBaseline, candidateVersion);
      await this.ssh.execCommand(vps, `rm -f -- ${q(backup)}; rmdir -- ${q(lock)}`, auth, 10_000);
      return candidateVersion;
    } catch (candidateError) {
      if (!swapped) {
        await this.ssh.execCommand(vps, `rm -f -- ${q(staged)}; rmdir -- ${q(lock)}`, auth, 10_000).catch(() => undefined);
        throw candidateError;
      }
      try {
        await ctx.update("rolling-back", 90);
        await this.stopOwned(vps, auth, binary, config, pidFile);
        await this.ssh.execCommand(vps, `test -f ${q(backup)} && mv -f -- ${q(backup)} ${q(binary)}`, auth, 10_000);
        const beforeRollback = (await this.agents.getState(vps.id))?.lastSeenAt;
        await this.start(vps, auth, binary, config, pidFile);
        await this.waitForObservation(vps.id, beforeRollback, prior.version!);
        await this.ssh.execCommand(vps, `rm -f -- ${q(staged)}; rmdir -- ${q(lock)}`, auth, 10_000);
      } catch { throw new Error("Agent upgrade failed and rollback could not be verified; recovery artifacts were preserved"); }
      throw candidateError;
    }
  }

  private async start(vps: VpsRecord, auth: { privateKey: string }, binary: string, config: string, pidFile: string) {
    const cmd = `umask 077; test ! -e ${q(`${pidFile}.tmp`)}; nohup ${q(binary)} -config ${q(config)} >/dev/null 2>&1 & _pid=$!; printf '%s\\n' \"$_pid\" > ${q(`${pidFile}.tmp`)} && mv -- ${q(`${pidFile}.tmp`)} ${q(pidFile)}; sleep .2; kill -0 \"$_pid\"; test \"$(readlink -f /proc/$_pid/exe)\" = ${q(binary)}; test \"$(tr '\\0' '\\n' < /proc/$_pid/cmdline | awk -v c=${q(config)} 'p==1&&$0==c{n++}{p=($0==\"-config\")}END{print n+0}')\" = 1`;
    await this.ssh.execCommand(vps, cmd, auth, 10_000);
  }
  private async stopOwned(vps: VpsRecord, auth: { privateKey: string }, binary: string, config: string, pidFile: string) {
    const result = await this.ssh.execCommand(vps, `_pid=$(cat ${q(pidFile)} 2>/dev/null); case \"$_pid\" in (''|*[!0-9]*) exit 1;; esac; printf '%s\\n' \"$_pid\"`, auth, 10_000);
    const pid = result.stdout.trim();
    if (!/^[1-9][0-9]*$/.test(pid)) throw new Error("Managed agent PID file is invalid");
    await this.stopPid(vps, auth, binary, config, pid);
  }
  private async stopPid(vps: VpsRecord, auth: { privateKey: string }, binary: string, config: string, pid: string) {
    // owns() is repeated immediately before TERM and again before KILL. If the
    // PID is reused at either boundary, no signal is sent to the new process.
    const cmd = [
      `_pid=${q(pid)}; _bin=${q(binary)}; _cfg=${q(config)};`,
      `owns(){ test \"$(readlink -f /proc/$_pid/exe 2>/dev/null)\" = \"$_bin\" && test \"$(tr '\\0' '\\n' < /proc/$_pid/cmdline 2>/dev/null | awk -v c=\"$_cfg\" 'p==1&&$0==c{n++}{p=($0==\"-config\")}END{print n+0}')\" = 1; };`,
      `owns || exit 1; owns && kill -TERM \"$_pid\";`,
      `_i=0; while owns && [ $_i -lt 50 ]; do sleep .1; _i=$((_i+1)); done;`,
      `if owns; then owns && kill -KILL \"$_pid\"; fi;`,
      `_i=0; while owns && [ $_i -lt 20 ]; do sleep .1; _i=$((_i+1)); done; ! owns`,
    ].join(" ");
    await this.ssh.execCommand(vps, cmd, auth, 10_000);
  }
  private async waitForObservation(vpsId: string, baseline: string | undefined, version: string) {
    const base = baseline ? Date.parse(baseline) : 0;
    const intervalMs = this.polling?.intervalMs ?? 500;
    const timeoutMs = this.polling?.timeoutMs ?? Math.max(60_000, this.config.agentInstallIntervalSeconds * 3_000);
    const sleep = this.polling?.sleep ?? defaultSleep;
    const attempts = Math.max(1, Math.ceil(timeoutMs / intervalMs));
    for (let i = 0; i < attempts; i++) {
      const state = await this.agents.getState(vpsId);
      if (state?.version === version && state.lastSeenAt && Date.parse(state.lastSeenAt) > base) return;
      await sleep(intervalMs);
    }
    throw new Error("Timed out waiting for upgraded agent observation");
  }
  private binaryPath() {
    const candidates = [this.config.agentBinaryPath, "/app/agent/vps-agent-linux-amd64", join(process.cwd(), "agent", "vps-agent-linux-amd64"), join(process.cwd(), "packages", "agent", "dist", "vps-agent-linux-amd64")].filter((x): x is string => Boolean(x));
    const path = candidates.find(existsSync);
    if (!path) throw new BadRequestException("Agent binary not found");
    return path;
  }
}
