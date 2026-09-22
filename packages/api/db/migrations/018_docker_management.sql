-- Docker management P2: independent enable flag plus durable operation ledger.
-- Transport stays abstract: the API only stores operations; no socket/CLI access.
-- Idempotency keys are globally unique so cross-VPS reuse is a conflict with no leak.

ALTER TABLE vps ADD COLUMN IF NOT EXISTS docker_management_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS docker_management_operations (
  id text PRIMARY KEY,
  vps_id text NOT NULL REFERENCES vps(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL UNIQUE,
  request_digest text NOT NULL,
  action text NOT NULL CHECK (action IN ('start', 'stop', 'restart', 'pause', 'unpause', 'remove')),
  target jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('queued', 'claimed', 'succeeded', 'failed', 'cancelled')),
  claimed_by text,
  lease_expires_at timestamptz,
  result jsonb,
  cancel_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT docker_management_operations_target_shape CHECK (jsonb_typeof(target) = 'object'),
  CONSTRAINT docker_management_operations_result_shape CHECK (result IS NULL OR jsonb_typeof(result) = 'object')
);

CREATE INDEX IF NOT EXISTS docker_management_operations_vps_idx
  ON docker_management_operations (vps_id, created_at DESC, id DESC);
