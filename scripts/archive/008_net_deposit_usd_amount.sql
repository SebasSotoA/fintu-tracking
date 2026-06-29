-- Migration: Store net USD on deposit/withdrawal rows (gross minus linked transfer fees).
-- Run once after deploying backend that writes net usd_amount on create/update.
-- Cash balance is unchanged: previously gross deposit minus linked fee; now net deposit only.

UPDATE cash_flows d
SET usd_amount = d.usd_amount - f.usd_amount
FROM cash_flows f
WHERE f.related_cash_flow_id = d.id
  AND f.type = 'fee'
  AND d.type IN ('deposit', 'withdrawal');
