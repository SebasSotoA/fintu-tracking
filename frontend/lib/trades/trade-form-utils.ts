import { toDateInputValue } from "@/lib/date-utils"
import { Decimal } from "@/lib/decimal"
import type { Holding, Trade } from "@/lib/types"

export interface TradeFormValues {
  date: string
  ticker: string
  asset_type: "stock" | "etf" | "crypto"
  side: "buy" | "sell"
  quantity: string
  price: string
  closing_fee: string
  notes: string
  is_opening_position: boolean
}

/** Prefill closing fee from Hapi field or legacy trade fee columns. */
export function tradeClosingFeeForForm(trade: Trade): string {
  const pick = (raw: string | undefined | null): string => {
    if (!raw) return ""
    try {
      const d = new Decimal(raw)
      return d.gt(0) ? d.toString() : ""
    } catch {
      return ""
    }
  }
  return pick(trade.closing_fee) || pick(trade.trading_fee)
}

export function sumTradeFees(values: Pick<TradeFormValues, "closing_fee">): Decimal {
  if (!values.closing_fee.trim()) return new Decimal(0)
  try {
    const d = new Decimal(values.closing_fee)
    return d.isFinite() && d.gte(0) ? d : new Decimal(0)
  } catch {
    return new Decimal(0)
  }
}

export function calculateTradeTotal(values: TradeFormValues): string {
  if (!values.quantity || !values.price) return "0"
  const quantity = new Decimal(values.quantity)
  const price = new Decimal(values.price)
  const fees = values.is_opening_position ? new Decimal(0) : sumTradeFees(values)
  const subtotal = quantity.mul(price)
  return values.side === "buy" ? subtotal.add(fees).toFixed(2) : subtotal.sub(fees).toFixed(2)
}

export function buildTradePayload(values: TradeFormValues) {
  const payload: {
    date: string
    ticker: string
    asset_type: "stock" | "etf" | "crypto"
    side: "buy" | "sell"
    quantity: string
    price: string
    notes: string | null
    closing_fee?: string
    is_opening_position?: boolean
  } = {
    date: toDateInputValue(values.date),
    ticker: values.ticker.toUpperCase(),
    asset_type: values.asset_type,
    side: values.side,
    quantity: values.quantity,
    price: values.price,
    notes: values.notes || null,
  }

  if (values.is_opening_position) {
    payload.is_opening_position = true
  } else if (values.closing_fee.trim()) {
    payload.closing_fee = values.closing_fee
  }

  return payload
}

export function validateSellQuantity(
  holdings: Holding[],
  ticker: string,
  side: "buy" | "sell",
  quantity: string,
  editingTrade?: Trade,
): string | null {
  if (side !== "sell") return null

  const selling = new Decimal(quantity)
  if (!selling.isFinite() || selling.lte(0)) return null

  const symbol = ticker.toUpperCase()
  const holding = holdings.find((h) => h.ticker.toUpperCase() === symbol)
  let available = new Decimal(holding?.quantity || 0)

  if (editingTrade && editingTrade.ticker.toUpperCase() === symbol && editingTrade.side === "sell") {
    available = available.add(new Decimal(editingTrade.quantity))
  }

  if (selling.gt(available)) {
    return `You hold ${available.toFixed(4)} shares of ${symbol}`
  }
  return null
}
