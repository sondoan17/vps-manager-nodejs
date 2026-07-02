CREATE TABLE IF NOT EXISTS dashboard_admin_credentials (
  id text PRIMARY KEY DEFAULT 'admin',
  password_hash text NOT NULL,
  password_algorithm text NOT NULL,
  password_params text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  password_changed_at timestamptz NOT NULL
);
