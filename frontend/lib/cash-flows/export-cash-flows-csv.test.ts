import { describe, expect, it } from "vitest"
import { cashFlowsToCsv } from "./export-cash-flows-csv"
import type { CashFlow } from "@/lib/types"

function makeCashFlow(overrides: Partial<CashFlow> = {}): CashFlow {
  return {
    id: "1",
    user_id: "u",
    date: "2026-03-01",
    type: "deposit",
    currency: "USD",
    amount: "1000",
    fx_rate: null,
    usd_amount: "1000",
    broker_id: null,
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

describe("cashFlowsToCsv", () => {
  it("includes header and one data row", () => {
    const csv = cashFlowsToCsv([makeCashFlow()])
    const lines = csv.split("\n")
    expect(lines[0]).toBe(
      "date,type,fee_type,currency,amount,usd_amount,fx_rate,notes",
    )
    expect(lines[1]).toBe("2026-03-01,deposit,,USD,1000,1000,,")
  })

  it("escapes notes containing commas and quotes", () => {
    const csv = cashFlowsToCsv([
      makeCashFlow({ notes: 'wire, "priority"', type: "fee", fee_type: "trading" }),
    ])
    expect(csv).toContain('"wire, ""priority"""')
    expect(csv).toContain(",trading,")
  })

  it("includes fx_rate for COP deposits", () => {
    const csv = cashFlowsToCsv([
      makeCashFlow({
        currency: "COP",
        amount: "4000000",
        fx_rate: "4000",
        usd_amount: "1000",
      }),
    ])
    expect(csv).toContain("COP,4000000,1000,4000,")
  })
})
