-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- FX Rates table
CREATE TABLE fx_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  rate NUMERIC(12, 4) NOT NULL,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Cash Flows table
CREATE TABLE cash_flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'fee')),
  currency TEXT NOT NULL CHECK (currency IN ('COP', 'USD')),
  amount NUMERIC(18, 2) NOT NULL,
  fx_rate NUMERIC(12, 4),
  usd_amount NUMERIC(18, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trades table
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  ticker TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('stock', 'etf')),
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity NUMERIC(18, 8) NOT NULL,
  price NUMERIC(18, 4) NOT NULL,
  fee NUMERIC(18, 2) DEFAULT 0,
  total NUMERIC(18, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Market Prices table (cached prices)
CREATE TABLE market_prices (
  ticker TEXT PRIMARY KEY,
  price NUMERIC(18, 4) NOT NULL,
  currency TEXT DEFAULT 'USD',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE fx_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_prices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fx_rates
CREATE POLICY "Users can view their own fx rates"
  ON fx_rates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fx rates"
  ON fx_rates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fx rates"
  ON fx_rates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fx rates"
  ON fx_rates FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for cash_flows
CREATE POLICY "Users can view their own cash flows"
  ON cash_flows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cash flows"
  ON cash_flows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cash flows"
  ON cash_flows FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cash flows"
  ON cash_flows FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for trades
CREATE POLICY "Users can view their own trades"
  ON trades FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trades"
  ON trades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trades"
  ON trades FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trades"
  ON trades FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for market_prices (public read, admin write)
CREATE POLICY "Anyone can view market prices"
  ON market_prices FOR SELECT
  TO authenticated
  USING (true);

-- Indexes for performance
CREATE INDEX idx_fx_rates_user_date ON fx_rates(user_id, date DESC);
CREATE INDEX idx_cash_flows_user_date ON cash_flows(user_id, date DESC);
CREATE INDEX idx_trades_user_date ON trades(user_id, date DESC);
CREATE INDEX idx_trades_user_ticker ON trades(user_id, ticker);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_cash_flows_updated_at
  BEFORE UPDATE ON cash_flows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trades_updated_at
  BEFORE UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
