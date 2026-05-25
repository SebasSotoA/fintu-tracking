import { formatCurrency } from "@/lib/decimal"
import type { CashFlow } from "@/lib/types"
import { computeNetUsdAfterFee, findLinkedDepositFee } from "./deposit-fee-utils"

export function getDepositWithdrawalUsdDisplay(cashFlows: CashFlow[], cf: CashFlow): string {
  const fee =
    cf.type === "deposit" || cf.type === "withdrawal"
      ? findLinkedDepositFee(cashFlows, cf.id)
      : undefined

  if (!fee) {
    return formatCurrency(cf.usd_amount, "USD")
  }

  const net = computeNetUsdAfterFee(cf.usd_amount, fee.usd_amount)
  return formatCurrency(net ?? cf.usd_amount, "USD")
}

export function getFeeAttributionLabel(cashFlows: CashFlow[], cf: CashFlow): string | null {
  if (cf.type !== "fee" || !cf.related_cash_flow_id) return null
  const parent = cashFlows.find((c) => c.id === cf.related_cash_flow_id)
  if (!parent || (parent.type !== "deposit" && parent.type !== "withdrawal")) return null
  return `Fee for ${parent.type}`
}
