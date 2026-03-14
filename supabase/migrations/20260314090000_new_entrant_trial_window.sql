-- Track new entrant trial window for server-side commission enforcement
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS is_new_entrant BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS new_entrant_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_providers_new_entrant_expires_at
  ON providers(new_entrant_expires_at)
  WHERE is_new_entrant = true;
