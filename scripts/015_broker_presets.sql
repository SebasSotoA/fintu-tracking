-- Migration: Add broker presets table and link cash flows/trades to brokers.
-- Run after 014_isolation_audit_indexes.sql (or any prior migration that leaves
-- cash_flows and trades without a broker_id).

-- ============================================================================
-- 1. BROKERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS brokers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preset_id TEXT NOT NULL,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  base_currency TEXT NOT NULL,
  local_currency TEXT NOT NULL,
  deposit_fee_type TEXT NOT NULL CHECK (deposit_fee_type IN ('percentage', 'flat', 'none')),
  deposit_fee_value NUMERIC(10, 6) DEFAULT 0,
  withdrawal_fee_type TEXT NOT NULL CHECK (withdrawal_fee_type IN ('percentage', 'flat', 'none')),
  withdrawal_fee_value NUMERIC(10, 6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, preset_id)
);

ALTER TABLE brokers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own brokers" ON brokers;
CREATE POLICY "Users can view their own brokers"
  ON brokers FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own brokers" ON brokers;
CREATE POLICY "Users can insert their own brokers"
  ON brokers FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own brokers" ON brokers;
CREATE POLICY "Users can update their own brokers"
  ON brokers FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own brokers" ON brokers;
CREATE POLICY "Users can delete their own brokers"
  ON brokers FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 2. BROKER ID ON CASH FLOWS AND TRADES
-- ============================================================================

ALTER TABLE cash_flows ADD COLUMN IF NOT EXISTS broker_id UUID REFERENCES brokers(id) ON DELETE SET NULL;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS broker_id UUID REFERENCES brokers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cash_flows_broker ON cash_flows(broker_id);
CREATE INDEX IF NOT EXISTS idx_trades_broker ON trades(broker_id);

-- ============================================================================
-- 3. FEE CASH FLOW TRIGGERS NOW CARRY broker_id
-- ============================================================================

CREATE OR REPLACE FUNCTION create_fee_cash_flows_for_trade()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deposit_fee > 0 THEN
    INSERT INTO cash_flows (
      user_id, date, type, currency, amount, usd_amount,
      broker_id, fee_type, related_trade_id, related_type, notes
    )
    VALUES (
      NEW.user_id, NEW.date, 'fee', 'USD', NEW.deposit_fee, NEW.deposit_fee,
      NEW.broker_id, 'deposit', NEW.id, 'trade',
      'Deposit fee for ' || NEW.ticker || ' ' || NEW.side || ' (' || NEW.quantity || ' shares @ $' || NEW.price || ')'
    );
  END IF;

  IF NEW.trading_fee > 0 THEN
    INSERT INTO cash_flows (
      user_id, date, type, currency, amount, usd_amount,
      broker_id, fee_type, related_trade_id, related_type, notes
    )
    VALUES (
      NEW.user_id, NEW.date, 'fee', 'USD', NEW.trading_fee, NEW.trading_fee,
      NEW.broker_id, 'trading', NEW.id, 'trade',
      'Trading commission for ' || NEW.ticker || ' ' || NEW.side || ' (' || NEW.quantity || ' shares @ $' || NEW.price || ')'
    );
  END IF;

  IF NEW.closing_fee > 0 THEN
    INSERT INTO cash_flows (
      user_id, date, type, currency, amount, usd_amount,
      broker_id, fee_type, related_trade_id, related_type, notes
    )
    VALUES (
      NEW.user_id, NEW.date, 'fee', 'USD', NEW.closing_fee, NEW.closing_fee,
      NEW.broker_id, 'closing', NEW.id, 'trade',
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
      broker_id, fee_type, related_trade_id, related_type, notes
    )
    VALUES (
      NEW.user_id, NEW.date, 'fee', 'USD', NEW.deposit_fee, NEW.deposit_fee,
      NEW.broker_id, 'deposit', NEW.id, 'trade',
      'Deposit fee for ' || NEW.ticker || ' ' || NEW.side || ' (' || NEW.quantity || ' shares @ $' || NEW.price || ')'
    );
  END IF;

  IF NEW.trading_fee > 0 THEN
    INSERT INTO cash_flows (
      user_id, date, type, currency, amount, usd_amount,
      broker_id, fee_type, related_trade_id, related_type, notes
    )
    VALUES (
      NEW.user_id, NEW.date, 'fee', 'USD', NEW.trading_fee, NEW.trading_fee,
      NEW.broker_id, 'trading', NEW.id, 'trade',
      'Trading commission for ' || NEW.ticker || ' ' || NEW.side || ' (' || NEW.quantity || ' shares @ $' || NEW.price || ')'
    );
  END IF;

  IF NEW.closing_fee > 0 THEN
    INSERT INTO cash_flows (
      user_id, date, type, currency, amount, usd_amount,
      broker_id, fee_type, related_trade_id, related_type, notes
    )
    VALUES (
      NEW.user_id, NEW.date, 'fee', 'USD', NEW.closing_fee, NEW.closing_fee,
      NEW.broker_id, 'closing', NEW.id, 'trade',
      'Closing fee for ' || NEW.ticker || ' ' || NEW.side || ' (' || NEW.quantity || ' shares @ $' || NEW.price || ')'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. UPDATED_AT TRIGGER FOR BROKERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_brokers_updated_at ON brokers;
CREATE TRIGGER update_brokers_updated_at
  BEFORE UPDATE ON brokers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. SEED DEFAULT BROKER FOR EXISTING USERS AND BACKFILL NULL broker_id
-- ============================================================================

INSERT INTO brokers (user_id, preset_id, name, country, base_currency, local_currency,
                     deposit_fee_type, deposit_fee_value, withdrawal_fee_type, withdrawal_fee_value)
SELECT DISTINCT u.id, 'hapi-colombia', 'Hapi', 'co', 'USD', 'COP', 'percentage', 0.009, 'none', 0
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM brokers b
  WHERE b.user_id = u.id AND b.preset_id = 'hapi-colombia'
);

UPDATE cash_flows
SET broker_id = b.id
FROM brokers b
WHERE cash_flows.user_id = b.user_id
  AND b.preset_id = 'hapi-colombia'
  AND cash_flows.broker_id IS NULL;

UPDATE trades
SET broker_id = b.id
FROM brokers b
WHERE trades.user_id = b.user_id
  AND b.preset_id = 'hapi-colombia'
  AND trades.broker_id IS NULL;
