import { describe, expect, it } from "vitest"
import { buildTradePayload, calculateTradeTotal, tradeClosingFeeForForm } from "./trade-form-utils"
import type { Trade } from "@/lib/types"

const baseFormValues = {
  date: "2026-06-01",
  ticker: "aapl",
  asset_type: "stock" as const,
  side: "buy" as const,
  quantity: "1",
  price: "100",
  closing_fee: "0.15",
  broker_id: "hapi-colombia",
  notes: "",
}

describe("tradeClosingFeeForForm", () => {
  it("prefers closing_fee", () => {
    const trade = {
      closing_fee: "0.15",
      trading_fee: "1",
    } as Trade
    expect(tradeClosingFeeForForm(trade)).toBe("0.15")
  })

  it("falls back to trading_fee", () => {
    expect(
      tradeClosingFeeForForm({ closing_fee: "0", trading_fee: "0.20" } as Trade),
    ).toBe("0.2")
  })
})

describe("buildTradePayload", () => {
  it("sends only closing_fee", () => {
    const payload = buildTradePayload(baseFormValues)
    expect(payload.closing_fee).toBe("0.15")
    expect(payload).not.toHaveProperty("deposit_fee")
    expect(payload).not.toHaveProperty("transaction_fx_rate")
    expect(payload).not.toHaveProperty("is_opening_position")
  })

  it("omits closing_fee when empty", () => {
    const payload = buildTradePayload({ ...baseFormValues, closing_fee: "" })
    expect(payload).not.toHaveProperty("closing_fee")
    expect(payload).not.toHaveProperty("is_opening_position")
  })
})

describe("calculateTradeTotal", () => {
  it("includes commission for buys", () => {
    expect(calculateTradeTotal(baseFormValues)).toBe("100.15")
  })

  it("subtracts commission for sells", () => {
    expect(
      calculateTradeTotal({ ...baseFormValues, side: "sell", quantity: "2", price: "10", closing_fee: "1.50" }),
    ).toBe("18.50")
  })
})
