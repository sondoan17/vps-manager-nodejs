import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildDockerStateProvisionCommand } from "../src/agents/agent-lifecycle-remote.js";

describe("buildDockerStateProvisionCommand", () => {
  const cmd = buildDockerStateProvisionCommand(
    "/home/deploy/.vps-manager-agent/vps-agent.stage-7",
    "/home/deploy/.vps-manager-agent",
  );

  it("fails closed on missing root/sudo before any provision call", () => {
    expect(cmd.startsWith("set -eu")).toBe(true);
    const sudoGuard = cmd.indexOf("passwordless sudo");
    expect(sudoGuard).toBeGreaterThan(-1);
    expect(sudoGuard).toBeLessThan(cmd.indexOf("-provision-docker-state"));
    expect(cmd).toContain('command -v sudo >/dev/null 2>&1 && sudo -n true');
  });

  it("refuses to rotate an existing identity before any provision call", () => {
    const guard = cmd.indexOf("refusing to rotate the installation identity");
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(cmd.indexOf("-provision-docker-state"));
    // The guard fires only for the unrecoverable state: keys without identity.
    expect(cmd).toContain('[ -e "$_rk" ] && [ ! -e "$_id" ]');
  });

  it("accepts only root or the login user as an existing runtime-keys owner", () => {
    const select = cmd.indexOf('case "$_o" in 0|"$_u")');
    expect(select).toBeGreaterThan(-1);
    expect(select).toBeLessThan(cmd.indexOf("-provision-docker-state"));
    expect(cmd).toContain("stat -c %u");
    expect(cmd).toContain("refusing to touch Docker runtime keys");
    // Fresh state provisions as root, then ownership is corrected.
    expect(cmd).toContain("_p=0");
  });

  it("provisions exactly twice: initial pass then service-owner verification", () => {
    expect(cmd.match(/-provision-docker-state/g)).toHaveLength(2);
    expect(cmd).toContain('-docker-runtime-owner-uid "$_p"');
    expect(cmd).toContain('-docker-runtime-owner-uid "$_u"');
  });

  it("enforces agent-expected ownership and mode between the passes", () => {
    const first = cmd.indexOf("-provision-docker-state");
    const second = cmd.indexOf("-provision-docker-state", first + 1);
    const chownIdentity = cmd.indexOf("chown root:root");
    const chownRuntime = cmd.indexOf('chown "$_u:$(id -gn)"');
    const chmod = cmd.indexOf("chmod 0600");
    expect(first).toBeGreaterThan(-1);
    expect(chownIdentity).toBeGreaterThan(first);
    expect(chownRuntime).toBeGreaterThan(chownIdentity);
    expect(chmod).toBeGreaterThan(chownRuntime);
    expect(second).toBeGreaterThan(chmod);
  });

  it("never deletes or replaces existing state", () => {
    expect(cmd).not.toMatch(/\brm\b/);
    expect(cmd).not.toMatch(/\bmv\b/);
  });

  it("quotes a remote directory with spaces and shell metacharacters", () => {
    const tricky = buildDockerStateProvisionCommand(
      "/home/deploy/.vps-manager-agent/vps-agent",
      "/home/deploy/dir with 'quote'",
    );
    // shellQuote: '...' with embedded '"'"' escapes; assignment stays one word.
    expect(tricky).toContain("_d='/home/deploy/dir with '\"'\"'quote'\"'\"'");
  });
});

describe("managed install/upgrade provisioning order", () => {
  // Static order: the provisioning call must precede any agent run (-once)
  // and any service start in each managed launch path.
  const cases: Array<{ name: string; path: string; start?: string }> = [
    {
      name: "remote installer service",
      path: "../src/agents/agent-installer.service.ts",
      start: "nohup",
    },
    {
      name: "remote upgrader service",
      path: "../src/agents/agent-upgrader.service.ts",
      start: "this.start(",
    },
    {
      name: "manual env installer",
      path: "../../../scripts/install-agent-from-env.ts",
    },
  ];

  for (const { name, path, start } of cases) {
    it(`${name} provisions before -once${start ? " and start" : ""}`, () => {
      const src = readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
      const provision = src.indexOf("buildDockerStateProvisionCommand(");
      const once = src.lastIndexOf(" -once");
      expect(provision).toBeGreaterThan(-1);
      expect(once).toBeGreaterThan(provision);
      if (start) expect(src.indexOf(start)).toBeGreaterThan(provision);
    });
  }
});
