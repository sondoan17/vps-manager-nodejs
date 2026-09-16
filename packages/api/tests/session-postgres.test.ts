import { describe, expect, it, vi } from "vitest";
import { createPostgresSessionRepository } from "../src/persistence/repositories/session.postgres.repository.js";

describe("Postgres session repository", () => {
  it("findActiveById queries only active sessions and maps the row", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: "s1", token_hash: "h", expires_at: "2030-01-01T00:00:00.000Z", created_at: "2029-01-01T00:00:00.000Z", revoked_at: null, ip_address: "127.0.0.1" }] });
    const repo = createPostgresSessionRepository({ query } as never);
    await expect(repo.findActiveById("s1")).resolves.toMatchObject({ id: "s1", tokenHash: "h" });
    expect(query).toHaveBeenCalledWith(expect.stringContaining("id = $1 AND revoked_at IS NULL AND expires_at > NOW()"), ["s1"]);
  });
});
