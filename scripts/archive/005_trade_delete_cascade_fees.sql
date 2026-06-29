-- Migration: Delete trade-linked fee cash flows when a trade is deleted
-- Run after 002_dual_track_fee_system.sql
--
-- Replaces ON DELETE SET NULL + broken AFTER DELETE trigger with CASCADE.
-- The API also deletes linked fees in DeleteTrade before removing the trade.

DROP TRIGGER IF EXISTS cleanup_fee_cash_flows_after_trade_delete ON trades;

ALTER TABLE cash_flows
  DROP CONSTRAINT IF EXISTS cash_flows_related_trade_id_fkey;

ALTER TABLE cash_flows
  ADD CONSTRAINT cash_flows_related_trade_id_fkey
  FOREIGN KEY (related_trade_id) REFERENCES trades(id) ON DELETE CASCADE;
