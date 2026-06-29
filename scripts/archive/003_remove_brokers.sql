-- Migration: Remove brokers table and broker_id columns
-- Run after 002_dual_track_fee_system.sql (or skip if 002 was never applied)

-- ============================================================================
-- 1. FEE CASH FLOW TRIGGERS (without broker_id)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_fee_cash_flows_for_trade()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deposit_fee > 0 THEN
    INSERT INTO cash_flows (
      user_id, date, type, currency, amount, usd_amount,
      fee_type, related_trade_id, related_type, notes
    )
    VALUES (
      NEW.user_id, NEW.date, 'fee', 'USD', NEW.deposit_fee, NEW.deposit_fee,
      'deposit', NEW.id, 'trade',
      'Deposit fee for ' || NEW.ticker || ' ' || NEW.side || ' (' || NEW.quantity || ' shares @ $' || NEW.price || ')'
    );
  END IF;

  IF NEW.trading_fee > 0 THEN
    INSERT INTO cash_flows (
      user_id, date, type, currency, amount, usd_amount,
      fee_type, related_trade_id, related_type, notes
    )
    VALUES (
      NEW.user_id, NEW.date, 'fee', 'USD', NEW.trading_fee, NEW.trading_fee,
      'trading', NEW.id, 'trade',
      'Trading commission for ' || NEW.ticker || ' ' || NEW.side || ' (' || NEW.quantity || ' shares @ $' || NEW.price || ')'
    );
  END IF;

  IF NEW.closing_fee > 0 THEN
    INSERT INTO cash_flows (
      user_id, date, type, currency, amount, usd_amount,
      fee_type, related_trade_id, related_type, notes
    )
    VALUES (
      NEW.user_id, NEW.date, 'fee', 'USD', NEW.closing_fee, NEW.closing_fee,
      'closing', NEW.id, 'trade',
      'Closing fee for ' || NEW.ticker || ' ' || NEW.side || ' (' || NEW.quantity || ' shares @ $' || NEW.price || ')'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_fee_cash_flows_for_trade()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM cash_flows
  WHERE related_trade_id = NEW.id
    AND type = 'fee'
    AND related_type = 'trade';

  IF NEW.deposit_fee > 0 THEN
    INSERT INTO cash_flows (
      user_id, date, type, currency, amount, usd_amount,
      fee_type, related_trade_id, related_type, notes
    )
    VALUES (
      NEW.user_id, NEW.date, 'fee', 'USD', NEW.deposit_fee, NEW.deposit_fee,
      'deposit', NEW.id, 'trade',
      'Deposit fee for ' || NEW.ticker || ' ' || NEW.side || ' (' || NEW.quantity || ' shares @ $' || NEW.price || ')'
    );
  END IF;

  IF NEW.trading_fee > 0 THEN
    INSERT INTO cash_flows (
      user_id, date, type, currency, amount, usd_amount,
      fee_type, related_trade_id, related_type, notes
    )
    VALUES (
      NEW.user_id, NEW.date, 'fee', 'USD', NEW.trading_fee, NEW.trading_fee,
      'trading', NEW.id, 'trade',
      'Trading commission for ' || NEW.ticker || ' ' || NEW.side || ' (' || NEW.quantity || ' shares @ $' || NEW.price || ')'
    );
  END IF;

  IF NEW.closing_fee > 0 THEN
    INSERT INTO cash_flows (
      user_id, date, type, currency, amount, usd_amount,
      fee_type, related_trade_id, related_type, notes
    )
    VALUES (
      NEW.user_id, NEW.date, 'fee', 'USD', NEW.closing_fee, NEW.closing_fee,
      'closing', NEW.id, 'trade',
      'Closing fee for ' || NEW.ticker || ' ' || NEW.side || ' (' || NEW.quantity || ' shares @ $' || NEW.price || ')'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. DROP BROKER COLUMNS AND TABLE
-- ============================================================================

DROP INDEX IF EXISTS idx_trades_broker;
DROP INDEX IF EXISTS idx_cash_flows_broker;

ALTER TABLE trades DROP COLUMN IF EXISTS broker_id;
ALTER TABLE cash_flows DROP COLUMN IF EXISTS broker_id;

DROP TRIGGER IF EXISTS update_brokers_updated_at ON brokers;
DROP TABLE IF EXISTS brokers;
