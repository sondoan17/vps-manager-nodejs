import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createVpsStore } from "../src/persistence/store/vpsStore.js";
import { createKeyService } from "../src/ssh/keyService.js";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "vps-manager-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("VPS store", () => {
  it("persists VPS metadata without password", async () => {
    const store = createVpsStore(join(tempDir, "data", "vps.json"));

    const created = await store.create({
      name: "demo",
      host: "203.0.113.10",
      port: 22,
      username: "root",
      password: "secret-password",
    });

    expect(created).toMatchObject({
      name: "demo",
      host: "203.0.113.10",
      username: "root",
    });
    expect(JSON.stringify(created)).not.toContain("secret-password");

    const reloaded = createVpsStore(join(tempDir, "data", "vps.json"));
    expect(await reloaded.get(created.id)).toEqual(created);
  });

  it("marks key provisioning without storing public key material", async () => {
    const store = createVpsStore(join(tempDir, "data", "vps.json"));
    const created = await store.create({
      name: "demo",
      host: "203.0.113.10",
      port: 22,
      username: "root",
    });

    const updated = await store.markKeyProvisioned(created.id);

    expect(updated?.keyProvisionedAt).toBeDefined();
    expect(JSON.stringify(await store.list())).not.toContain("ssh-ed25519");
  });
});

describe("key service", () => {
  it("creates an ed25519 key pair with OpenSSH public key and private key outside responses", async () => {
    const keys = createKeyService(join(tempDir, "private", "keys"));

    const pair = await keys.ensureKeyPair("vps_123");

    expect(pair.publicKey).toMatch(/^ssh-ed25519 /);
    expect(pair.privateKeyPath).toContain(join("private", "keys", "vps_123"));
    expect(pair.privateKey).toContain("PRIVATE KEY");
  });
});
