-- Add updated_at to fx_rates so the shared Postgres TTL cache can track freshness.
ALTER TABLE fx_rates ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill existing rows so TTL checks start from the original creation time.
UPDATE fx_rates SET updated_at = created_at WHERE updated_at IS NULL;

-- Keep updated_at current on upserts / manual edits.
CREATE TRIGGER update_fx_rates_updated_at
  BEFORE UPDATE ON fx_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index to support cache lookup by user, date, source, and freshness.
CREATE INDEX idx_fx_rates_user_date_source_updated
  ON fx_rates(user_id, date DESC, source, updated_at);
