-- Docker monitoring I3 ingest foundation; ordinary PostgreSQL only.
CREATE TABLE IF NOT EXISTS docker_snapshot_ledger (
 vps_id text NOT NULL REFERENCES vps(id) ON DELETE CASCADE, snapshot_id text NOT NULL,
 agent_instance_id text NOT NULL, request_digest text NOT NULL, source_sequence numeric(78,0) NOT NULL,
 received_at timestamptz NOT NULL, result jsonb NOT NULL, revision bigint NOT NULL,
 PRIMARY KEY (vps_id,snapshot_id), UNIQUE (vps_id,agent_instance_id,source_sequence),
 CHECK (source_sequence > 0), CHECK (jsonb_typeof(result)='object')
);
CREATE TABLE IF NOT EXISTS docker_ingest_latest (
 vps_id text PRIMARY KEY REFERENCES vps(id) ON DELETE CASCADE, active_instance_id text NOT NULL,
 active_snapshot_id text NOT NULL, source_sequence numeric(78,0) NOT NULL, received_at timestamptz NOT NULL,
 updated_at timestamptz NOT NULL, revision bigint NOT NULL, compatibility jsonb NOT NULL,
 CHECK (source_sequence > 0), CHECK (jsonb_typeof(compatibility)='object')
);
CREATE TABLE IF NOT EXISTS docker_ingest_batch_results (
 vps_id text NOT NULL REFERENCES vps(id) ON DELETE CASCADE, batch_id text NOT NULL,
 result jsonb NOT NULL, revision bigint NOT NULL, PRIMARY KEY (vps_id,batch_id), CHECK (jsonb_typeof(result)='object')
);
CREATE INDEX IF NOT EXISTS docker_snapshot_ledger_received_idx ON docker_snapshot_ledger(vps_id,received_at DESC);
