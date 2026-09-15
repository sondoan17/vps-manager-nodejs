-- Agent-detected VPS location; nullable for old rows and payloads.
ALTER TABLE vps ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE vps ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE vps ADD COLUMN IF NOT EXISTS location_detected_at timestamptz;
