-- Add cash_adjustment cash flow type and opening position support.

ALTER TABLE cash_flows
  DROP CONSTRAINT IF EXISTS cash_flows_type_check;

ALTER TABLE cash_flows
  ADD CONSTRAINT cash_flows_type_check
  CHECK (type IN ('deposit', 'withdrawal', 'fee', 'cash_adjustment'));

ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS is_opening_position BOOLEAN NOT NULL DEFAULT FALSE;
