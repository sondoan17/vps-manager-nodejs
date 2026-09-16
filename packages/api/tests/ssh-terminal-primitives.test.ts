import { EventEmitter } from "node:events";
import { describe, expect, it, beforeEach, vi } from "vitest";

const state = { connects: [] as Record<string, any>[], shell: vi.fn(), ends: 0 };

vi.mock("node:dns/promises", () => ({ lookup: vi.fn(async () => [{ address: "198.51.100.44", family: 4 }]) }));

vi.mock("ssh2", () => {
  class MockClient {
    private handlers = new Map<string, Function[]>();
    once(event: string, cb: Function) { this.handlers.set(event, [cb]); return this; }
    connect(options: Record<string, any>) {
      state.connects.push(options);
      queueMicrotask(() => this.handlers.get("ready")?.[0]?.());
    }
    shell(options: Record<string, any>, cb: Function) {
      state.shell(options);
      if (state.shell.mock.results[state.shell.mock.results.length - 1]?.value instanceof Error) return cb(state.shell.mock.results[state.shell.mock.results.length - 1].value);
      const channel = new EventEmitter() as any;
      channel.end = vi.fn();
      cb(undefined, channel);
    }
    end() { state.ends++; }
  }
  return { Client: MockClient };
});

import { openManagedSshShell, validateSshPtyDimensions } from "../src/ssh/sshService.js";
import { computeFingerprint } from "../src/ssh/ssh-host-policy.js";
import { SshService } from "../src/ssh/ssh.service.js";
import type { AppConfig } from "../src/config/app-config.js";
import type { VpsRecord } from "../src/vps/vps.models.js";

const config = { mode: "local", allowPrivateNetworkTargets: true, sshHostKeyPolicy: "strict", sshHostKeyPins: {} } as AppConfig;
const vps: VpsRecord = { id: "vps-1", name: "test", host: "203.0.113.20", port: 22, username: "root", createdAt: "", updatedAt: "" };
const security = { vettedHost: "203.0.113.21", hasTrustedHostKeyPin: true, hostVerifier: vi.fn(), serverHostKeyAlgorithms: ["ssh-ed25519"] };

beforeEach(() => { state.connects.length = 0; state.shell.mockReset(); state.ends = 0; });

describe("SSH terminal primitives", () => {
  it("validates bounded PTY dimensions", () => {
    expect(validateSshPtyDimensions({ cols: 120, rows: 32 })).toEqual({ cols: 120, rows: 32, height: 0, width: 0 });
    expect(() => validateSshPtyDimensions({ cols: 0, rows: 32 })).toThrow();
    expect(() => validateSshPtyDimensions({ cols: 501, rows: 32 })).toThrow();
    expect(() => validateSshPtyDimensions({ cols: 120, rows: 201 })).toThrow();
  });

  it("fails closed without a pin before connecting", async () => {
    await expect(openManagedSshShell(vps, { privateKey: "key" }, { cols: 80, rows: 24 }, { ...security, hasTrustedHostKeyPin: false })).rejects.toThrow(/trusted host key verification/);
    expect(state.connects).toHaveLength(0);
  });

  it("rejects blank keys and never sends a password", async () => {
    await expect(openManagedSshShell(vps, { privateKey: "   " }, { cols: 80, rows: 24 }, security)).rejects.toThrow(/private key/);
    expect(state.connects).toHaveLength(0);
    const shell = await openManagedSshShell(vps, { privateKey: "key" }, { cols: 80, rows: 24 }, security);
    expect(state.connects[0]).not.toHaveProperty("password");
    shell.close();
  });

  it("requires verifier and vetted host even when pin flag is asserted", async () => {
    await expect(openManagedSshShell(vps, { privateKey: "key" }, { cols: 80, rows: 24 }, { hasTrustedHostKeyPin: true })).rejects.toThrow(/vetted host/);
    expect(state.connects).toHaveLength(0);
  });

  it("propagates vetted host, verifier, algorithms and PTY values", async () => {
    const shell = await openManagedSshShell(vps, { privateKey: "key" }, { cols: 100, rows: 40, height: 800, width: 1200 }, security);
    expect(state.connects[0]).toMatchObject({ host: "203.0.113.21", hostVerifier: security.hostVerifier, algorithms: { serverHostKey: ["ssh-ed25519"] } });
    expect(state.shell).toHaveBeenCalledWith({ term: "xterm-256color", cols: 100, rows: 40, height: 800, width: 1200 });
    shell.close(); shell.close();
    expect(state.ends).toBe(1);
  });

  it("cleans up client when shell opening fails", async () => {
    state.shell.mockImplementationOnce(() => new Error("shell failed"));
    await expect(openManagedSshShell(vps, { privateKey: "key" }, { cols: 80, rows: 24 }, security)).rejects.toThrow();
    expect(state.ends).toBe(1);
  });

  it("high-level terminal path is strict, resolves once, and verifies matching/mismatching keys", async () => {
    const publicKey = Buffer.from("terminal-host-key");
    const pins = [computeFingerprint(publicKey)];
    const pinService = { getTrustedFingerprints: vi.fn().mockResolvedValue(pins), resolveKeyType: vi.fn().mockResolvedValue("ssh-ed25519") };
    const service = new SshService({ ...config, sshHostKeyPolicy: "permissive" }, { record: vi.fn() } as any, pinService as any);
    const result = await service.openManagedShell(vps, { privateKey: "key" }, { cols: 80, rows: 24 });
    expect(pinService.getTrustedFingerprints).toHaveBeenCalledTimes(1);
    expect(state.connects[0]).toMatchObject({ host: vps.host, algorithms: { serverHostKey: ["ssh-ed25519"] } });
    const verifier = state.connects[0].hostVerifier;
    const matching = vi.fn(); verifier(publicKey, matching); expect(matching).toHaveBeenCalledWith(true);
    const mismatch = vi.fn(); verifier(Buffer.from("wrong-key"), mismatch); expect(mismatch).toHaveBeenCalledWith(false);
    result.close();
  });

  it("high-level permissive terminal without pins rejects before connect", async () => {
    const pinService = { getTrustedFingerprints: vi.fn().mockResolvedValue([]), resolveKeyType: vi.fn().mockResolvedValue(undefined) };
    const service = new SshService({ ...config, sshHostKeyPolicy: "permissive" }, { record: vi.fn() } as any, pinService as any);
    await expect(service.openManagedShell(vps, { privateKey: "key" }, { cols: 80, rows: 24 })).rejects.toThrow();
    expect(state.connects).toHaveLength(0);
    expect(pinService.getTrustedFingerprints).toHaveBeenCalledTimes(1);
  });

  it("high-level hostname uses vetted DNS literal and blocked target fails pre-connect", async () => {
    const hostVps = { ...vps, host: "terminal.example.test" };
    const pinService = { getTrustedFingerprints: vi.fn().mockResolvedValue(["SHA256:pin"]), resolveKeyType: vi.fn().mockResolvedValue(undefined) };
    const service = new SshService(config, { record: vi.fn() } as any, pinService as any);
    const result = await service.openManagedShell(hostVps, { privateKey: "key" }, { cols: 80, rows: 24 });
    expect(state.connects[0].host).toBe("198.51.100.44");
    result.close();
    const blocked = { ...vps, host: "127.0.0.1" };
    await expect(service.openManagedShell(blocked, { privateKey: "key" }, { cols: 80, rows: 24 })).rejects.toThrow();
    expect(state.connects).toHaveLength(1);
  });
});
