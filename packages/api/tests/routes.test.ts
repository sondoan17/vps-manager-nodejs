import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createKeyService } from "../src/services/keyService.js";
import { createVpsStore } from "../src/store/vpsStore.js";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "vps-manager-routes-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

function app() {
  return createApp({
    store: createVpsStore(join(tempDir, "data", "vps.json")),
    keys: createKeyService(join(tempDir, "private", "keys"))
  });
}

describe("routes", () => {
  it("returns health status", async () => {
    await request(app()).get("/api/health").expect(200, { ok: true });
  });

  it("creates and lists VPS records without leaking submitted password", async () => {
    const server = app();
    const create = await request(server)
      .post("/api/vps")
      .send({ name: "prod", host: "203.0.113.20", port: 22, username: "root", password: "secret" })
      .expect(201);

    expect(create.body.data.id).toMatch(/^vps_/);
    expect(JSON.stringify(create.body)).not.toContain("secret");

    const list = await request(server).get("/api/vps").expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(JSON.stringify(list.body)).not.toContain("secret");
    expect(JSON.stringify(list.body)).not.toContain("ssh-ed25519");
  });

  it("sanitizes validation and not-found errors", async () => {
    const bad = await request(app()).post("/api/vps").send({ password: "secret" }).expect(400);
    expect(bad.body.error.message).toBe("Invalid request");
    expect(JSON.stringify(bad.body)).not.toContain("secret");

    await request(app()).get("/api/vps/missing").expect(404, { error: { message: "VPS not found" } });
  });

  it("serves public dashboard assets without exposing private or data directories", async () => {
    const server = app();

    const page = await request(server).get("/").expect(200);
    expect(page.text).toContain("VPS Manager");

    await request(server).get("/private/keys/vps_123").expect(404);
    await request(server).get("/data/vps.json").expect(404);
    await request(server).get("/packages/web/src/App.tsx").expect(404);
    await request(server).get("/packages/api/src/app.ts").expect(404);
  });
});
