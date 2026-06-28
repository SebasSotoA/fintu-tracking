import type { CashFlowCurrency } from "@/lib/market-config/market-config"

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
  type: "deposit" | "withdrawal" | "fee" | "cash_adjustment"
  currency: CashFlowCurrency
  amount: string
  fx_rate: string | null
  usd_amount: string
  broker_id: string | null
  notes: string | null
  fee_type: "deposit" | "trading" | "closing" | "maintenance" | "other" | "withdrawal" | null
  related_trade_id: string | null
  related_cash_flow_id: string | null
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
  deposit_fee: string
  trading_fee: string
  closing_fee: string
  total_fees: string
  total: string
  broker_id: string | null
  notes: string | null
  is_opening_position?: boolean
  realized_pl?: string | null
  realized_pl_pct?: string | null
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
  assetType?: string
  quantity: string
  avgCost: string
  totalInvested: string
  avgCostWithFees?: string
  totalInvestedWithFees?: string
  totalFees?: string
  currentPrice?: string
  priceAsOf?: string | null
  price_as_of?: string | null
  market_price_updated_at?: string | null
  marketValue: string
  unrealizedPL: string
  unrealizedPLPercent: string
  feeImpactPercent?: string
}

export interface NetWorthData {
  holdings_value: string
  cash_balance: string
  net_worth: string
  total_invested: string
  total_fees: string
  total_gain_loss: string
  total_gain_loss_pct: string
  xirr: string
  total_deposited_cop?: string
  total_withdrawn_cop?: string
  breakdown: {
    by_asset_type: Record<string, string>
    by_ticker: Record<string, string>
  }
}
