-- Migration: Link deposit/withdrawal fees to parent cash flow (not trades)
-- Run after 003_remove_brokers.sql
--
-- related_trade_id remains FK -> trades(id) for trade-originated fees.
-- related_cash_flow_id links fee rows to deposit/withdrawal cash_flows rows.

ALTER TABLE cash_flows
  ADD COLUMN IF NOT EXISTS related_cash_flow_id UUID
  REFERENCES cash_flows(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cash_flows_related_cash_flow
  ON cash_flows(related_cash_flow_id)
  WHERE related_cash_flow_id IS NOT NULL;

COMMENT ON COLUMN cash_flows.related_cash_flow_id IS 'Links fee cash flows to their originating deposit or withdrawal cash flow';
