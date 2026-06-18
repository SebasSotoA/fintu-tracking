-- Migration 010: Reclassify fake AMD sale deposit as USD cash adjustment.
-- Identified in DB 2026-06-17: deposit used to mirror AMD sale proceeds for buying power
-- without a real COP salary deposit. Keeps usd_amount (buying power); removes from net-deposit/invested metrics.
--
-- Row: id=0502c46f-ace4-48c8-bcbf-c8147a9d115c
--       user_id=b3b91e12-b32c-4779-9284-39082d950a6b
--       usd_amount=90.68
--       notes=Depósito FALSO de venta de AMD (NO depósito del sueldo)

BEGIN;

DO $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE cash_flows
  SET
    type = 'cash_adjustment',
    currency = 'USD',
    amount = usd_amount,
    fx_rate = NULL,
    notes = COALESCE(notes, '') || ' [reclassified from deposit via 010]',
    updated_at = NOW()
  WHERE id = '0502c46f-ace4-48c8-bcbf-c8147a9d115c'
    AND user_id = 'b3b91e12-b32c-4779-9284-39082d950a6b'
    AND type = 'deposit';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 1 THEN
    RAISE EXCEPTION '010: expected 1 deposit row to update, got %', updated_count;
  END IF;
END $$;

COMMIT;
