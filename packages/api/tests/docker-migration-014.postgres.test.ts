import { describe, expect, it } from "vitest";
import pg from "pg";
import { loadMigrations } from "../src/db/migrations.js";

const databaseUrl = process.env.VPS_MANAGER_TEST_POSTGRES_URL;

describe("014 docker ingest migration (plain PostgreSQL)", () => {
  it.skipIf(!databaseUrl)("executes after 013 and enforces ingest constraints", async () => {
    const admin = new pg.Pool({ connectionString: databaseUrl });
    const schema = `vps_manager_014_${Date.now()}`;
    await admin.query(`CREATE SCHEMA "${schema}"`);
    const pool = new pg.Pool({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
    try {
      await pool.query(`CREATE TABLE vps (id text PRIMARY KEY, name text NOT NULL, host text NOT NULL, port integer NOT NULL, username text NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL)`);
      for (const id of ["013_docker_monitoring.sql", "014_docker_ingest.sql"]) {
        await pool.query((await loadMigrations()).find((m) => m.id === id)!.sql);
      }
      await pool.query(`INSERT INTO vps VALUES ('v','v','h',22,'u',now(),now())`);
      await pool.query(`INSERT INTO docker_snapshot_ledger VALUES ('v','s','i','d',1,now(),'{}',1)`);
      await expect(pool.query(`INSERT INTO docker_snapshot_ledger VALUES ('v','s2','i','d',0,now(),'{}',2)`)).rejects.toThrow();
      await expect(pool.query(`INSERT INTO docker_ingest_latest VALUES ('v','i','s',1,now(),now(),1,'[]')`)).rejects.toThrow();
      await pool.query(`INSERT INTO docker_ingest_latest VALUES ('v','i','s',1,now(),now(),1,'{}')`);
      await pool.query(`CREATE TABLE IF NOT EXISTS marker (ok boolean)`);
      await pool.query(`INSERT INTO marker VALUES (true)`);
      await pool.query((await loadMigrations()).find((m) => m.id === "014_docker_ingest.sql")!.sql);
      expect((await pool.query("SELECT count(*)::int AS n FROM docker_snapshot_ledger")).rows[0].n).toBe(1);
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await admin.end();
    }
  });
});
