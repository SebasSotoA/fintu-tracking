export interface FxRate {
  id: string
  user_id: string
  date: string
  rate: string
  source: string
  created_at: string
}

export interface CashFlow {
  id: string
  user_id: string
  date: string
  type: "deposit" | "withdrawal" | "fee"
  currency: "COP" | "USD"
  amount: string
  fx_rate: string | null
  usd_amount: string
  notes: string | null
  broker_id: string | null
  fee_type: "deposit" | "trading" | "closing" | "maintenance" | "other" | "withdrawal" | null
  related_trade_id: string | null
  related_type: "trade" | "deposit" | "withdrawal" | "standalone" | null
  created_at: string
  updated_at: string
}

export interface Trade {
  id: string
  user_id: string
  date: string
  ticker: string
  asset_type: "stock" | "etf" | "crypto"
  side: "buy" | "sell"
  quantity: string
  price: string
  fee: string
  broker_id: string | null
  deposit_fee: string
  trading_fee: string
  closing_fee: string
  total_fees: string
  transaction_fx_rate: string | null
  total: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface MarketPrice {
  ticker: string
  price: string
  currency: string
  updated_at: string
}

export interface Holding {
  ticker: string
  quantity: string
  avgCost: string
  totalInvested: string
  marketValue: string
  unrealizedPL: string
  unrealizedPLPercent: string
}
