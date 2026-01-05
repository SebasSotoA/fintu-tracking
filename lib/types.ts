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
  created_at: string
  updated_at: string
}

export interface Trade {
  id: string
  user_id: string
  date: string
  ticker: string
  asset_type: "stock" | "etf"
  side: "buy" | "sell"
  quantity: string
  price: string
  fee: string
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
