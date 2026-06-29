-- Backfill granular trading_fee from legacy fee column where granular fees were never set.
-- Idempotent: safe to re-run; only updates rows still missing trading_fee.

UPDATE trades
SET trading_fee = fee
WHERE COALESCE(trading_fee, 0) = 0
  AND COALESCE(fee, 0) > 0
  AND COALESCE(deposit_fee, 0) = 0
  AND COALESCE(closing_fee, 0) = 0;
