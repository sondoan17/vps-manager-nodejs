import { describe, expect, it, vi } from "vitest";
import { TerminalSessionRegistry } from "../src/terminal/terminal-registry.js";

describe("terminal registry", () => {
  it("atomically enforces global, dashboard, and VPS limits and releases capacity", () => {
    // Arrange
    const global = new TerminalSessionRegistry({ global: 1, perDashboard: 2, perVps: 2 });
    const dashboard = new TerminalSessionRegistry({ global: 5, perDashboard: 1, perVps: 5 });
    const vps = new TerminalSessionRegistry({ global: 5, perDashboard: 5, perVps: 1 });
    const close = vi.fn(async () => {});
    // Act/Assert: positive admissions and negative crossings prove no partial registration.
    const admitted = global.admit("d", "v", close);
    expect(() => global.admit("d2", "v2", close)).toThrow("SESSION_LIMIT_REACHED");
    expect(global.size).toBe(1);
    global.release(admitted.id);
    expect(global.admit("d2", "v2", close)).toBeDefined();
    dashboard.admit("d", "v1", close); expect(() => dashboard.admit("d", "v2", close)).toThrow("SESSION_LIMIT_REACHED");
    vps.admit("d1", "v", close); expect(() => vps.admit("d2", "v", close)).toThrow("SESSION_LIMIT_REACHED");
  });

  it("bulk closes dashboard, VPS, and shutdown sessions even when one close rejects", async () => {
    // Arrange
    const registry = new TerminalSessionRegistry({ global: 10, perDashboard: 10, perVps: 10 });
    const calls: string[] = [];
    registry.admit("d", "v1", async reason => { calls.push(`a:${reason}`); });
    registry.admit("d", "v2", async reason => { calls.push(`b:${reason}`); throw new Error("failure"); });
    registry.admit("other", "v1", async reason => { calls.push(`c:${reason}`); });
    // Act/Assert: negative close failure is settled and registrations are always removed.
    await registry.closeByDashboard("d"); expect(registry.size).toBe(1);
    await registry.closeByVps("v1"); expect(registry.size).toBe(0);
    registry.admit("x", "x", async reason => { calls.push(reason); });
    await registry.closeAll(); expect(registry.size).toBe(0); expect(calls).toContain("server_shutdown");
  });
});
