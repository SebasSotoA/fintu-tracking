import { Decimal } from "@/lib/decimal"
import { MARKET_CONFIG, type CashFlowCurrency } from "@/lib/market-config/market-config"
import type { CashFlow } from "@/lib/types"

export function findLinkedDepositFee(cashFlows: CashFlow[], cashFlowId: string): CashFlow | undefined {
  return cashFlows.find((cf) => cf.type === "fee" && cf.related_cash_flow_id === cashFlowId)
}

export function computeGrossUsd(currency: CashFlowCurrency, amount: string, fxRate: string): string {
  if (!amount.trim()) return "0"
  const amountDec = new Decimal(amount)
  if (currency === MARKET_CONFIG.baseCurrency) {
    return amountDec.toString()
  }
  if (!fxRate.trim()) return "0"
  return amountDec.div(new Decimal(fxRate)).toFixed(2)
}

export function computeNetUsdAfterFee(grossUsd: string, feeUsd: string): string | null {
  if (!feeUsd.trim()) return null
  try {
    const fee = new Decimal(feeUsd)
    if (!fee.isFinite() || fee.lte(0)) return null
    const gross = new Decimal(grossUsd || "0")
    if (!gross.isFinite()) return null
    return gross.sub(fee).toFixed(2)
  } catch {
    return null
  }
}

export function parsePositiveFee(feeUsd: string): string | null {
  const t = feeUsd.trim()
  if (!t) return null
  try {
    const d = new Decimal(t)
    if (!d.isFinite() || d.lte(0)) return null
    return d.toFixed(2)
  } catch {
    return null
  }
}

export function feeTypeForCashFlowType(type: "deposit" | "withdrawal"): "deposit" | "withdrawal" {
  return type === "withdrawal" ? "withdrawal" : "deposit"
}
