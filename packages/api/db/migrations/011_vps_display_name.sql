-- Add optional display_name column to the vps table.
-- This is a human-friendly label, separate from the unique `name` used
-- for SSH provisioning. Nullable and defaults to NULL so existing
-- VPS records remain backward compatible without a value.
ALTER TABLE vps ADD COLUMN IF NOT EXISTS display_name text;
