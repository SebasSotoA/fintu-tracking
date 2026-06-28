-- Track per-user market-price refreshes so we can enforce a cooldown and prevent API hammering.
CREATE TABLE market_price_refresh_log (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_market_price_refresh_log_refreshed_at
  ON market_price_refresh_log(refreshed_at);

ALTER TABLE market_price_refresh_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own refresh log"
  ON market_price_refresh_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert their own refresh log"
  ON market_price_refresh_log FOR ALL
  WITH CHECK (auth.uid() = user_id);
