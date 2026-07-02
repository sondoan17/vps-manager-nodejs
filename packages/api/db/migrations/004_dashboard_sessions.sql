CREATE TABLE IF NOT EXISTS dashboard_sessions (
  id text PRIMARY KEY,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  revoked_at timestamptz,
  ip_address text
);

CREATE INDEX IF NOT EXISTS idx_dashboard_sessions_token_hash ON dashboard_sessions (token_hash);
CREATE INDEX IF NOT EXISTS idx_dashboard_sessions_expires_at ON dashboard_sessions (expires_at);
