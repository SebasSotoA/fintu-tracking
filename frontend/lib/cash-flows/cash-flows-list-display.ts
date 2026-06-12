import type { CashFlow } from "@/lib/types"

export function getFeeAttributionLabel(cashFlows: CashFlow[], cf: CashFlow): string | null {
  if (cf.type !== "fee" || !cf.related_cash_flow_id) return null
  const parent = cashFlows.find((c) => c.id === cf.related_cash_flow_id)
  if (!parent || (parent.type !== "deposit" && parent.type !== "withdrawal")) return null
  return `Fee for ${parent.type}`
}
