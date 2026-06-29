-- Baseline schema for Fintu Tracking.
-- Captures the current desired database state as of the broker-presets + onboarding
-- refactor. Historical scripts under scripts/archive/ led here but are no longer run.

-- ============================================================================
-- Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Tables
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

CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  ticker TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('stock', 'etf', 'crypto')),
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity NUMERIC(18, 8) NOT NULL,
  price NUMERIC(18, 4) NOT NULL,
  fee NUMERIC(18, 2) DEFAULT 0,
  deposit_fee NUMERIC(18, 2) DEFAULT 0,
  trading_fee NUMERIC(18, 2) DEFAULT 0,
  closing_fee NUMERIC(18, 2) DEFAULT 0,
  total_fees NUMERIC(18, 2) GENERATED ALWAYS AS
    (COALESCE(deposit_fee, 0) + COALESCE(trading_fee, 0) + COALESCE(closing_fee, 0)) STORED,
  total NUMERIC(18, 2) GENERATED ALWAYS AS (
    CASE
      WHEN side = 'buy' THEN
        (quantity * price) + COALESCE(fee, 0) + COALESCE(deposit_fee, 0) + COALESCE(trading_fee, 0) + COALESCE(closing_fee, 0)
      WHEN side = 'sell' THEN
        (quantity * price) - COALESCE(fee, 0) - COALESCE(deposit_fee, 0) - COALESCE(trading_fee, 0) - COALESCE(closing_fee, 0)
      ELSE (quantity * price)
    END
  ) STORED,
  is_opening_position BOOLEAN NOT NULL DEFAULT FALSE,
  broker_id UUID REFERENCES brokers(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cash_flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'fee', 'cash_adjustment')),
  currency TEXT NOT NULL CHECK (currency IN ('COP', 'USD')),
  amount NUMERIC(18, 2) NOT NULL,
  fx_rate NUMERIC(12, 4),
  usd_amount NUMERIC(18, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  broker_id UUID REFERENCES brokers(id) ON DELETE SET NULL,
  fee_type TEXT CHECK (fee_type IN ('deposit', 'trading', 'closing', 'maintenance', 'other', 'withdrawal')),
  related_trade_id UUID REFERENCES trades(id) ON DELETE CASCADE,
  related_type TEXT CHECK (related_type IN ('trade', 'deposit', 'withdrawal', 'standalone')),
  related_cash_flow_id UUID REFERENCES cash_flows(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS fx_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  rate NUMERIC(12, 4) NOT NULL,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS market_prices (
  ticker TEXT PRIMARY KEY,
  price NUMERIC(18, 4) NOT NULL,
  currency TEXT DEFAULT 'USD',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS market_price_refresh_log (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  total_value_usd NUMERIC(18, 2) NOT NULL,
  total_invested_usd NUMERIC(18, 2) NOT NULL,
  total_cash_usd NUMERIC(18, 2) NOT NULL,
  total_fees_usd NUMERIC(18, 2) NOT NULL,
  total_fx_impact_usd NUMERIC(18, 2) DEFAULT 0,
  holdings JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country TEXT NOT NULL DEFAULT 'co',
  broker_preset_id TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  onboarding_step TEXT NOT NULL DEFAULT 'welcome',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_fx_rates_user_date ON fx_rates(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_fx_rates_user_date_source_updated ON fx_rates(user_id, date DESC, source, updated_at);

CREATE INDEX IF NOT EXISTS idx_cash_flows_user_date ON cash_flows(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_flows_related_cash_flow ON cash_flows(related_cash_flow_id) WHERE related_cash_flow_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cash_flows_related_trade ON cash_flows(related_trade_id) WHERE related_trade_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cash_flows_broker ON cash_flows(broker_id);
CREATE INDEX IF NOT EXISTS idx_cash_flows_fee_type ON cash_flows(fee_type) WHERE fee_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trades_user_date ON trades(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_trades_user_ticker ON trades(user_id, ticker);
CREATE INDEX IF NOT EXISTS idx_trades_broker ON trades(broker_id);

CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_user_date ON portfolio_snapshots(user_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_market_price_refresh_log_refreshed_at ON market_price_refresh_log(refreshed_at);

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE fx_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_prices DISABLE ROW LEVEL SECURITY;

-- fx_rates
DROP POLICY IF EXISTS "Users can view their own fx rates" ON fx_rates;
CREATE POLICY "Users can view their own fx rates"
  ON fx_rates FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own fx rates" ON fx_rates;
CREATE POLICY "Users can insert their own fx rates"
  ON fx_rates FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own fx rates" ON fx_rates;
CREATE POLICY "Users can update their own fx rates"
  ON fx_rates FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own fx rates" ON fx_rates;
CREATE POLICY "Users can delete their own fx rates"
  ON fx_rates FOR DELETE USING (auth.uid() = user_id);

-- cash_flows
DROP POLICY IF EXISTS "Users can view their own cash flows" ON cash_flows;
CREATE POLICY "Users can view their own cash flows"
  ON cash_flows FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own cash flows" ON cash_flows;
CREATE POLICY "Users can insert their own cash flows"
  ON cash_flows FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own cash flows" ON cash_flows;
CREATE POLICY "Users can update their own cash flows"
  ON cash_flows FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own cash flows" ON cash_flows;
CREATE POLICY "Users can delete their own cash flows"
  ON cash_flows FOR DELETE USING (auth.uid() = user_id);

-- trades
DROP POLICY IF EXISTS "Users can view their own trades" ON trades;
CREATE POLICY "Users can view their own trades"
  ON trades FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own trades" ON trades;
CREATE POLICY "Users can insert their own trades"
  ON trades FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own trades" ON trades;
CREATE POLICY "Users can update their own trades"
  ON trades FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own trades" ON trades;
CREATE POLICY "Users can delete their own trades"
  ON trades FOR DELETE USING (auth.uid() = user_id);

-- brokers
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

-- portfolio_snapshots
DROP POLICY IF EXISTS "Users can view their own portfolio snapshots" ON portfolio_snapshots;
CREATE POLICY "Users can view their own portfolio snapshots"
  ON portfolio_snapshots FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own portfolio snapshots" ON portfolio_snapshots;
CREATE POLICY "Users can insert their own portfolio snapshots"
  ON portfolio_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own portfolio snapshots" ON portfolio_snapshots;
CREATE POLICY "Users can update their own portfolio snapshots"
  ON portfolio_snapshots FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own portfolio snapshots" ON portfolio_snapshots;
CREATE POLICY "Users can delete their own portfolio snapshots"
  ON portfolio_snapshots FOR DELETE USING (auth.uid() = user_id);

-- market_prices (global read)
DROP POLICY IF EXISTS "Anyone can view market prices" ON market_prices;
CREATE POLICY "Anyone can view market prices"
  ON market_prices FOR SELECT TO authenticated USING (true);

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- Helper functions
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE OR REPLACE FUNCTION get_user_total_fees(p_user_id UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(usd_amount), 0)
  FROM cash_flows
  WHERE user_id = p_user_id AND type = 'fee';
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION get_user_fees_by_type(p_user_id UUID)
RETURNS TABLE(fee_type TEXT, total_amount NUMERIC) AS $$
  SELECT
    COALESCE(fee_type, 'unspecified') as fee_type,
    SUM(usd_amount) as total_amount
  FROM cash_flows
  WHERE user_id = p_user_id AND type = 'fee'
  GROUP BY fee_type
  ORDER BY total_amount DESC;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION get_user_available_cash(p_user_id UUID)
RETURNS NUMERIC AS $$
  SELECT
    COALESCE(SUM(
      CASE
        WHEN type = 'deposit' THEN usd_amount
        WHEN type = 'withdrawal' THEN -usd_amount
        WHEN type = 'fee' THEN -usd_amount
        ELSE 0
      END
    ), 0)
  FROM cash_flows
  WHERE user_id = p_user_id;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- Triggers
-- ============================================================================
DROP TRIGGER IF EXISTS update_cash_flows_updated_at ON cash_flows;
CREATE TRIGGER update_cash_flows_updated_at
  BEFORE UPDATE ON cash_flows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trades_updated_at ON trades;
CREATE TRIGGER update_trades_updated_at
  BEFORE UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fx_rates_updated_at ON fx_rates;
CREATE TRIGGER update_fx_rates_updated_at
  BEFORE UPDATE ON fx_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_brokers_updated_at ON brokers;
CREATE TRIGGER update_brokers_updated_at
  BEFORE UPDATE ON brokers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS create_fee_cash_flows_after_trade ON trades;
CREATE TRIGGER create_fee_cash_flows_after_trade
  AFTER INSERT ON trades
  FOR EACH ROW
  EXECUTE FUNCTION create_fee_cash_flows_for_trade();

DROP TRIGGER IF EXISTS update_fee_cash_flows_after_trade_update ON trades;
CREATE TRIGGER update_fee_cash_flows_after_trade_update
  AFTER UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION update_fee_cash_flows_for_trade();

-- ============================================================================
-- Views
-- ============================================================================
CREATE OR REPLACE VIEW fee_reconciliation_summary AS
SELECT
  t.user_id,
  t.id as trade_id,
  t.ticker,
  t.date,
  t.side,
  t.total_fees as trade_total_fees,
  COALESCE(SUM(cf.usd_amount), 0) as cash_flow_total_fees,
  t.total_fees - COALESCE(SUM(cf.usd_amount), 0) as reconciliation_diff
FROM trades t
LEFT JOIN cash_flows cf ON cf.related_trade_id = t.id AND cf.type = 'fee' AND cf.related_type = 'trade'
WHERE t.total_fees > 0
GROUP BY t.user_id, t.id, t.ticker, t.date, t.side, t.total_fees;

CREATE OR REPLACE VIEW orphaned_fee_cash_flows AS
SELECT
  cf.id,
  cf.user_id,
  cf.date,
  cf.fee_type,
  cf.usd_amount,
  cf.related_trade_id,
  cf.notes
FROM cash_flows cf
WHERE cf.type = 'fee'
  AND cf.related_type = 'trade'
  AND cf.related_trade_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM trades t WHERE t.id = cf.related_trade_id
  );
