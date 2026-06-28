-- Migration: clarify market_prices access control
-- market_prices is intentionally global (no user_id, shared cache of ticker prices).
-- RLS was enabled with only a public-read policy, which made the write path implicit
-- and could confuse future schema reviewers. We disable RLS here because all writes
-- are performed by the backend service role and the table has no per-user rows.

ALTER TABLE market_prices DISABLE ROW LEVEL SECURITY;
