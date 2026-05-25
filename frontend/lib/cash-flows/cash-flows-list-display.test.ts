import { describe, expect, it } from "vitest"
import type { CashFlow } from "@/lib/types"
import {
  getDepositWithdrawalUsdDisplay,
  getFeeAttributionLabel,
  getLinkedFeeUsdHint,
} from "./cash-flows-list-display"

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

describe("getDepositWithdrawalUsdDisplay", () => {
  it("shows gross USD when no linked fee", () => {
    const deposit = baseCashFlow({ id: "dep-1", usd_amount: "100.00" })
    const result = getDepositWithdrawalUsdDisplay([deposit], deposit)
    expect(result.primaryUsd).toBe("$100.00")
    expect(result.breakdown).toBeUndefined()
  })

  it("shows net USD and gross/fee breakdown when linked fee exists", () => {
    const deposit = baseCashFlow({ id: "dep-1", usd_amount: "395.99" })
    const fee = baseCashFlow({
      id: "fee-1",
      type: "fee",
      usd_amount: "1.99",
      fee_type: "deposit",
      related_cash_flow_id: "dep-1",
      related_type: "deposit",
    })
    const result = getDepositWithdrawalUsdDisplay([deposit, fee], deposit)
    expect(result.primaryUsd).toBe("$394.00")
    expect(result.breakdown).toBe("Gross $395.99 · fee $1.99")
  })
})

describe("getLinkedFeeUsdHint", () => {
  it("returns parent gross hint for deposit-linked fee", () => {
    const deposit = baseCashFlow({ id: "dep-1", usd_amount: "395.99" })
    const fee = baseCashFlow({
      id: "fee-1",
      type: "fee",
      usd_amount: "1.99",
      fee_type: "deposit",
      related_cash_flow_id: "dep-1",
    })
    expect(getLinkedFeeUsdHint([deposit, fee], fee)).toBe("of $395.99 deposit")
  })

  it("returns null when fee is not linked to a transfer", () => {
    const fee = baseCashFlow({ id: "fee-1", type: "fee", usd_amount: "1.99" })
    expect(getLinkedFeeUsdHint([fee], fee)).toBeNull()
  })
})

describe("getFeeAttributionLabel", () => {
  it("describes fee for parent deposit with parent date", () => {
    const deposit = baseCashFlow({ id: "dep-1", date: "2026-06-01", type: "deposit" })
    const fee = baseCashFlow({
      id: "fee-1",
      type: "fee",
      related_cash_flow_id: "dep-1",
      fee_type: "deposit",
    })
    expect(getFeeAttributionLabel([deposit, fee], fee)).toBe("Fee for deposit · 6/1/2026")
  })

  it("returns null for standalone fee", () => {
    const fee = baseCashFlow({ id: "fee-1", type: "fee", fee_type: "other" })
    expect(getFeeAttributionLabel([fee], fee)).toBeNull()
  })
})
