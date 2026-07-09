CREATE TABLE IF NOT EXISTS ssh_host_key_pins (
  id TEXT PRIMARY KEY,
  vps_id TEXT NOT NULL REFERENCES vps(id) ON DELETE CASCADE,
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  fingerprint TEXT NOT NULL,
  key_type TEXT,
  trusted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ssh_host_key_pins_vps_id
ON ssh_host_key_pins(vps_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ssh_host_key_pins_host_port
ON ssh_host_key_pins(host, port);
