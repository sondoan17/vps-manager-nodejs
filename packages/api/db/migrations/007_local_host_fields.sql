-- Add optional kind and managed_by columns to the vps table.
-- These are used by the local agent supervisor to distinguish
-- local system-managed hosts from user-created remote hosts.
-- Both columns are optional (nullable) to avoid breaking existing records.

ALTER TABLE vps ADD COLUMN IF NOT EXISTS kind text CHECK (kind IN ('remote', 'local'));
ALTER TABLE vps ADD COLUMN IF NOT EXISTS managed_by text CHECK (managed_by IN ('user', 'system'));
