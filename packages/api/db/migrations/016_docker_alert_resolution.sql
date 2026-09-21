ALTER TABLE docker_alerts ADD COLUMN IF NOT EXISTS resolution_reason text;
ALTER TABLE docker_alerts DROP CONSTRAINT IF EXISTS docker_alerts_resolution_reason_check;
ALTER TABLE docker_alerts ADD CONSTRAINT docker_alerts_resolution_reason_check CHECK (resolution_reason IS NULL OR resolution_reason IN ('monitoring_disabled', 'identity_reset_orphaned', 'vps_deleted', 'condition_cleared', 'container_removed'));

CREATE TABLE IF NOT EXISTS docker_alert_rule_states (
  vps_id text NOT NULL REFERENCES vps(id) ON DELETE CASCADE,
  rule_kind text NOT NULL,
  state jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (vps_id, rule_kind),
  CONSTRAINT docker_alert_rule_states_json CHECK (jsonb_typeof(state) = 'object')
);
