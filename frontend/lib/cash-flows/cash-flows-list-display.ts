import { formatCurrency } from "@/lib/decimal"
import type { CashFlow } from "@/lib/types"
import {
  computeNetUsdAfterFee,
  findLinkedDepositFee,
  parsePositiveFee,
} from "./deposit-fee-utils"

export function getDepositWithdrawalUsdDisplay(cashFlows: CashFlow[], cf: CashFlow): string {
  if (cf.type === "deposit" || cf.type === "withdrawal") {
    const linkedFeeUsd = parsePositiveFee(cf.linked_transfer_fee_usd ?? "")
    if (linkedFeeUsd) {
      const net = computeNetUsdAfterFee(cf.usd_amount, linkedFeeUsd)
      return formatCurrency(net ?? cf.usd_amount, "USD")
    }

    const fee = findLinkedDepositFee(cashFlows, cf.id)
    if (fee) {
      const net = computeNetUsdAfterFee(cf.usd_amount, fee.usd_amount)
      return formatCurrency(net ?? cf.usd_amount, "USD")
    }
  }

  return formatCurrency(cf.usd_amount, "USD")
}

export function getFeeAttributionLabel(cashFlows: CashFlow[], cf: CashFlow): string | null {
  if (cf.type !== "fee" || !cf.related_cash_flow_id) return null
  const parent = cashFlows.find((c) => c.id === cf.related_cash_flow_id)
  if (!parent || (parent.type !== "deposit" && parent.type !== "withdrawal")) return null
  return `Fee for ${parent.type}`
}
