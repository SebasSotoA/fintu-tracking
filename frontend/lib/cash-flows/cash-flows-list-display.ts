import { formatCalendarDate } from "@/lib/date-utils"
import { formatCurrency } from "@/lib/decimal"
import type { CashFlow } from "@/lib/types"
import { computeNetUsdAfterFee, findLinkedDepositFee } from "./deposit-fee-utils"

export interface DepositWithdrawalUsdDisplay {
  primaryUsd: string
  breakdown?: string
}

export function getDepositWithdrawalUsdDisplay(
  cashFlows: CashFlow[],
  cf: CashFlow,
): DepositWithdrawalUsdDisplay {
  const fee =
    cf.type === "deposit" || cf.type === "withdrawal"
      ? findLinkedDepositFee(cashFlows, cf.id)
      : undefined

  if (!fee) {
    return { primaryUsd: formatCurrency(cf.usd_amount, "USD") }
  }

  const net = computeNetUsdAfterFee(cf.usd_amount, fee.usd_amount)
  const primaryUsd = formatCurrency(net ?? cf.usd_amount, "USD")
  const breakdown = `Gross ${formatCurrency(cf.usd_amount, "USD")} · fee ${formatCurrency(fee.usd_amount, "USD")}`
  return { primaryUsd, breakdown }
}

export function getLinkedFeeUsdHint(cashFlows: CashFlow[], cf: CashFlow): string | null {
  if (cf.type !== "fee" || !cf.related_cash_flow_id) return null
  const parent = cashFlows.find((c) => c.id === cf.related_cash_flow_id)
  if (!parent || (parent.type !== "deposit" && parent.type !== "withdrawal")) return null
  return `of ${formatCurrency(parent.usd_amount, "USD")} ${parent.type}`
}

export function getFeeAttributionLabel(cashFlows: CashFlow[], cf: CashFlow): string | null {
  if (cf.type !== "fee" || !cf.related_cash_flow_id) return null
  const parent = cashFlows.find((c) => c.id === cf.related_cash_flow_id)
  if (!parent || (parent.type !== "deposit" && parent.type !== "withdrawal")) return null
  const parentDate = formatCalendarDate(parent.date, "en-US")
  return `Fee for ${parent.type} · ${parentDate}`
}
