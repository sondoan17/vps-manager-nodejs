CREATE INDEX IF NOT EXISTS vps_status_idx ON vps(status);

CREATE INDEX IF NOT EXISTS agent_credentials_vps_id_idx ON agent_credentials(vps_id);
CREATE INDEX IF NOT EXISTS agent_credentials_status_idx ON agent_credentials(status);

CREATE INDEX IF NOT EXISTS jobs_vps_id_idx ON jobs(vps_id);
CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs(status);
CREATE INDEX IF NOT EXISTS jobs_updated_at_idx ON jobs(updated_at DESC);

CREATE INDEX IF NOT EXISTS audit_events_timestamp_idx ON audit_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS audit_events_resource_idx ON audit_events(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS audit_events_result_idx ON audit_events(result);
CREATE INDEX IF NOT EXISTS audit_events_event_code_idx ON audit_events(event_code);

CREATE INDEX IF NOT EXISTS metric_samples_vps_effective_idx ON metric_samples(vps_id, effective_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS metric_samples_effective_idx ON metric_samples(effective_at DESC);
CREATE INDEX IF NOT EXISTS metric_latest_effective_idx ON metric_latest(effective_at DESC);
