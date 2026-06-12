import { describe, expect, it } from "vitest"
import type { CashFlow } from "@/lib/types"
import { getFeeAttributionLabel, isMirroredTradeFeeRow } from "./cash-flows-list-display"

function baseCashFlow(overrides: Partial<CashFlow>): CashFlow {
  return {
    id: "cf-1",
    user_id: "u1",
    date: "2026-06-01",
    type: "deposit",
    currency: "USD",
    amount: "395.99",
    fx_rate: null,
    usd_amount: "395.99",
    notes: null,
    fee_type: null,
    related_trade_id: null,
    related_cash_flow_id: null,
    related_type: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  }
}

describe("getFeeAttributionLabel", () => {
  it("describes fee for parent deposit without date in label", () => {
    const deposit = baseCashFlow({ id: "dep-1", date: "2026-06-01", type: "deposit" })
    const fee = baseCashFlow({
      id: "fee-1",
      type: "fee",
      related_cash_flow_id: "dep-1",
      fee_type: "deposit",
    })
    expect(getFeeAttributionLabel([deposit, fee], fee)).toBe("Fee for deposit")
  })

  it("returns null for standalone fee", () => {
    const fee = baseCashFlow({ id: "fee-1", type: "fee", fee_type: "other" })
    expect(getFeeAttributionLabel([fee], fee)).toBeNull()
  })
})

describe("isMirroredTradeFeeRow", () => {
  it("returns true for fee rows linked to trades", () => {
    const fee = baseCashFlow({
      id: "fee-1",
      type: "fee",
      related_type: "trade",
      related_trade_id: "t-1",
    })
    expect(isMirroredTradeFeeRow(fee)).toBe(true)
  })

  it("returns false for standalone fees", () => {
    const fee = baseCashFlow({ id: "fee-1", type: "fee", fee_type: "other" })
    expect(isMirroredTradeFeeRow(fee)).toBe(false)
  })
})
