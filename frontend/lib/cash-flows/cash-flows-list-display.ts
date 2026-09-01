import type { InterpolationVars, MessageKey } from "@/lib/i18n/types"
import type { CashFlow } from "@/lib/types"

type Translate = (key: MessageKey, vars?: InterpolationVars) => string

export function getCashFlowTypeLabel(type: CashFlow["type"], t?: Translate): string {
  if (t) {
    if (type === "cash_adjustment") return t("cash.typeCashAdjustment")
    if (type === "deposit") return t("cash.typeDeposit")
    if (type === "withdrawal") return t("cash.typeWithdrawal")
    if (type === "fee") return t("cash.typeFee")
  }
  if (type === "cash_adjustment") return "Cash adjustment"
  return type.charAt(0).toUpperCase() + type.slice(1)
}

export function getFeeAttributionLabel(
  cashFlows: CashFlow[],
  cf: CashFlow,
  t?: Translate,
): string | null {
  if (cf.type !== "fee" || !cf.related_cash_flow_id) return null
  const parent = cashFlows.find((c) => c.id === cf.related_cash_flow_id)
  if (!parent || (parent.type !== "deposit" && parent.type !== "withdrawal")) return null
  if (t) {
    return parent.type === "deposit" ? t("cash.feeForDeposit") : t("cash.feeForWithdrawal")
  }
  return `Fee for ${parent.type}`
}

export function isMirroredTradeFeeRow(cf: CashFlow): boolean {
  return cf.type === "fee" && cf.related_type === "trade" && !!cf.related_trade_id
}
