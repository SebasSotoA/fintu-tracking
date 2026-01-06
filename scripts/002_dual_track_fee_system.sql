-- Migration: Dual-Track Fee System Enhancement
-- This adds brokers, enhanced fee tracking, and automatic cash flow linking

-- ============================================================================
-- 1. CREATE BROKERS TABLE
-- ============================================================================

CREATE TABLE brokers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  default_deposit_fee_pct NUMERIC(5, 4) DEFAULT 0,
  default_trading_fee_pct NUMERIC(5, 4) DEFAULT 0,
  default_closing_fee_pct NUMERIC(5, 4) DEFAULT 0,
  default_maintenance_fee NUMERIC(18, 2) DEFAULT 0,
  fee_calculation_method TEXT DEFAULT 'percentage' CHECK (fee_calculation_method IN ('percentage', 'flat', 'tiered')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Enable RLS for brokers
ALTER TABLE brokers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own brokers"
  ON brokers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own brokers"
  ON brokers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brokers"
  ON brokers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brokers"
  ON brokers FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_brokers_user ON brokers(user_id);

-- ============================================================================
-- 2. ENHANCE TRADES TABLE
-- ============================================================================

-- Add new fee columns and broker relationship
ALTER TABLE trades 
  ADD COLUMN broker_id UUID REFERENCES brokers(id) ON DELETE SET NULL,
  ADD COLUMN deposit_fee NUMERIC(18, 2) DEFAULT 0,
  ADD COLUMN trading_fee NUMERIC(18, 2) DEFAULT 0,
  ADD COLUMN closing_fee NUMERIC(18, 2) DEFAULT 0,
  ADD COLUMN transaction_fx_rate NUMERIC(12, 4);

-- Add crypto to asset types
ALTER TABLE trades 
  DROP CONSTRAINT trades_asset_type_check,
  ADD CONSTRAINT trades_asset_type_check CHECK (asset_type IN ('stock', 'etf', 'crypto'));

-- Add computed column for total fees
ALTER TABLE trades 
  ADD COLUMN total_fees NUMERIC(18, 2) GENERATED ALWAYS AS 
    (COALESCE(deposit_fee, 0) + COALESCE(trading_fee, 0) + COALESCE(closing_fee, 0)) STORED;

-- Migrate existing fee data: move old 'fee' column to 'trading_fee'
UPDATE trades SET trading_fee = COALESCE(fee, 0) WHERE fee IS NOT NULL AND fee > 0;

-- Update total calculation to include all fees (buy side adds fees, sell side subtracts fees)
-- For buy: total = (quantity * price) + all fees
-- For sell: total = (quantity * price) - all fees
ALTER TABLE trades DROP COLUMN total;
ALTER TABLE trades ADD COLUMN total NUMERIC(18, 2) GENERATED ALWAYS AS (
  CASE 
    WHEN side = 'buy' THEN 
      (quantity * price) + COALESCE(fee, 0) + COALESCE(deposit_fee, 0) + COALESCE(trading_fee, 0) + COALESCE(closing_fee, 0)
    WHEN side = 'sell' THEN 
      (quantity * price) - COALESCE(fee, 0) - COALESCE(deposit_fee, 0) - COALESCE(trading_fee, 0) - COALESCE(closing_fee, 0)
    ELSE (quantity * price)
  END
) STORED;

-- Add index for broker lookups
CREATE INDEX idx_trades_broker ON trades(broker_id) WHERE broker_id IS NOT NULL;

-- ============================================================================
-- 3. ENHANCE CASH FLOWS TABLE
-- ============================================================================

-- Add fee tracking and trade attribution columns
ALTER TABLE cash_flows 
  ADD COLUMN broker_id UUID REFERENCES brokers(id) ON DELETE SET NULL,
  ADD COLUMN fee_type TEXT CHECK (fee_type IN ('deposit', 'trading', 'closing', 'maintenance', 'other', 'withdrawal')),
  ADD COLUMN related_trade_id UUID REFERENCES trades(id) ON DELETE SET NULL,
  ADD COLUMN related_type TEXT CHECK (related_type IN ('trade', 'deposit', 'withdrawal', 'standalone'));

-- Create index for efficient trade-to-cashflow lookups
CREATE INDEX idx_cash_flows_related_trade ON cash_flows(related_trade_id) WHERE related_trade_id IS NOT NULL;
CREATE INDEX idx_cash_flows_broker ON cash_flows(broker_id) WHERE broker_id IS NOT NULL;
CREATE INDEX idx_cash_flows_fee_type ON cash_flows(fee_type) WHERE fee_type IS NOT NULL;

-- ============================================================================
-- 4. CREATE PORTFOLIO SNAPSHOTS TABLE
-- ============================================================================

CREATE TABLE portfolio_snapshots (
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

-- Enable RLS for portfolio_snapshots
ALTER TABLE portfolio_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own portfolio snapshots"
  ON portfolio_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own portfolio snapshots"
  ON portfolio_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolio snapshots"
  ON portfolio_snapshots FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own portfolio snapshots"
  ON portfolio_snapshots FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_portfolio_snapshots_user_date ON portfolio_snapshots(user_id, snapshot_date DESC);

-- ============================================================================
-- 5. AUTOMATIC FEE CASH FLOW CREATION TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION create_fee_cash_flows_for_trade()
RETURNS TRIGGER AS $$
BEGIN
  -- Create cash flow for deposit fee if exists
  IF NEW.deposit_fee > 0 THEN
    INSERT INTO cash_flows (
      user_id, 
      date, 
      type, 
      currency, 
      amount, 
      usd_amount, 
      fee_type, 
      related_trade_id, 
      related_type, 
      broker_id,
      notes
    )
    VALUES (
      NEW.user_id, 
      NEW.date, 
      'fee', 
      'USD', 
      NEW.deposit_fee, 
      NEW.deposit_fee, 
      'deposit', 
      NEW.id, 
      'trade',
      NEW.broker_id,
      'Deposit fee for ' || NEW.ticker || ' ' || NEW.side || ' (' || NEW.quantity || ' shares @ $' || NEW.price || ')'
    );
  END IF;

  -- Create cash flow for trading fee if exists
  IF NEW.trading_fee > 0 THEN
    INSERT INTO cash_flows (
      user_id, 
      date, 
      type, 
      currency, 
      amount, 
      usd_amount, 
      fee_type, 
      related_trade_id, 
      related_type,
      broker_id,
      notes
    )
    VALUES (
      NEW.user_id, 
      NEW.date, 
      'fee', 
      'USD', 
      NEW.trading_fee, 
      NEW.trading_fee, 
      'trading', 
      NEW.id, 
      'trade',
      NEW.broker_id,
      'Trading commission for ' || NEW.ticker || ' ' || NEW.side || ' (' || NEW.quantity || ' shares @ $' || NEW.price || ')'
    );
  END IF;

  -- Create cash flow for closing fee if exists (typically on sells)
  IF NEW.closing_fee > 0 THEN
    INSERT INTO cash_flows (
      user_id, 
      date, 
      type, 
      currency, 
      amount, 
      usd_amount, 
      fee_type, 
      related_trade_id, 
      related_type,
      broker_id,
      notes
    )
    VALUES (
      NEW.user_id, 
      NEW.date, 
      'fee', 
      'USD', 
      NEW.closing_fee, 
      NEW.closing_fee, 
      'closing', 
      NEW.id, 
      'trade',
      NEW.broker_id,
      'Closing fee for ' || NEW.ticker || ' ' || NEW.side || ' (' || NEW.quantity || ' shares @ $' || NEW.price || ')'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires AFTER trade insert
CREATE TRIGGER create_fee_cash_flows_after_trade
  AFTER INSERT ON trades
  FOR EACH ROW
  EXECUTE FUNCTION create_fee_cash_flows_for_trade();

-- ============================================================================
-- 6. UPDATE TRIGGER FOR FEE CHANGES ON TRADES
-- ============================================================================

CREATE OR REPLACE FUNCTION update_fee_cash_flows_for_trade()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete old fee cash flows linked to this trade
  DELETE FROM cash_flows 
  WHERE related_trade_id = NEW.id 
    AND type = 'fee'
    AND related_type = 'trade';
  
  -- Recreate fee cash flows with new values
  IF NEW.deposit_fee > 0 THEN
    INSERT INTO cash_flows (
      user_id, date, type, currency, amount, usd_amount, 
      fee_type, related_trade_id, related_type, broker_id, notes
    )
    VALUES (
      NEW.user_id, NEW.date, 'fee', 'USD', NEW.deposit_fee, NEW.deposit_fee, 
      'deposit', NEW.id, 'trade', NEW.broker_id,
      'Deposit fee for ' || NEW.ticker || ' ' || NEW.side || ' (' || NEW.quantity || ' shares @ $' || NEW.price || ')'
    );
  END IF;

  IF NEW.trading_fee > 0 THEN
    INSERT INTO cash_flows (
      user_id, date, type, currency, amount, usd_amount, 
      fee_type, related_trade_id, related_type, broker_id, notes
    )
    VALUES (
      NEW.user_id, NEW.date, 'fee', 'USD', NEW.trading_fee, NEW.trading_fee, 
      'trading', NEW.id, 'trade', NEW.broker_id,
      'Trading commission for ' || NEW.ticker || ' ' || NEW.side || ' (' || NEW.quantity || ' shares @ $' || NEW.price || ')'
    );
  END IF;

  IF NEW.closing_fee > 0 THEN
    INSERT INTO cash_flows (
      user_id, date, type, currency, amount, usd_amount, 
      fee_type, related_trade_id, related_type, broker_id, notes
    )
    VALUES (
      NEW.user_id, NEW.date, 'fee', 'USD', NEW.closing_fee, NEW.closing_fee, 
      'closing', NEW.id, 'trade', NEW.broker_id,
      'Closing fee for ' || NEW.ticker || ' ' || NEW.side || ' (' || NEW.quantity || ' shares @ $' || NEW.price || ')'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fee_cash_flows_after_trade_update
  AFTER UPDATE ON trades
  FOR EACH ROW
  WHEN (
    OLD.deposit_fee IS DISTINCT FROM NEW.deposit_fee OR
    OLD.trading_fee IS DISTINCT FROM NEW.trading_fee OR
    OLD.closing_fee IS DISTINCT FROM NEW.closing_fee
  )
  EXECUTE FUNCTION update_fee_cash_flows_for_trade();

-- ============================================================================
-- 7. CLEANUP TRIGGER FOR TRADE DELETION
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_fee_cash_flows_for_trade()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete fee cash flows linked to the deleted trade
  DELETE FROM cash_flows 
  WHERE related_trade_id = OLD.id 
    AND type = 'fee'
    AND related_type = 'trade';
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_fee_cash_flows_after_trade_delete
  AFTER DELETE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_fee_cash_flows_for_trade();

-- ============================================================================
-- 8. RECONCILIATION VIEWS
-- ============================================================================

-- View: Fee reconciliation summary
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

-- View: Orphaned fee cash flows (fees without related trades)
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

-- ============================================================================
-- 9. HELPER FUNCTIONS
-- ============================================================================

-- Function to get total fees for a user
CREATE OR REPLACE FUNCTION get_user_total_fees(p_user_id UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(usd_amount), 0)
  FROM cash_flows
  WHERE user_id = p_user_id AND type = 'fee';
$$ LANGUAGE SQL STABLE;

-- Function to get total fees by type for a user
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

-- Function to get available cash for a user
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
-- 10. ADD TRIGGER FOR BROKER updated_at
-- ============================================================================

CREATE TRIGGER update_brokers_updated_at
  BEFORE UPDATE ON brokers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Add comment to track migration
COMMENT ON TABLE brokers IS 'Stores broker information and default fee structures';
COMMENT ON TABLE portfolio_snapshots IS 'Historical snapshots of portfolio value and composition';
COMMENT ON COLUMN trades.deposit_fee IS 'Fee charged for depositing funds (affects cost basis)';
COMMENT ON COLUMN trades.trading_fee IS 'Commission fee for executing the trade (affects cost basis)';
COMMENT ON COLUMN trades.closing_fee IS 'Fee charged when closing a position (affects proceeds)';
COMMENT ON COLUMN trades.total_fees IS 'Computed total of all fees on this trade';
COMMENT ON COLUMN cash_flows.related_trade_id IS 'Links fee cash flows to their originating trade';
COMMENT ON COLUMN cash_flows.fee_type IS 'Categorizes the type of fee for reporting';

