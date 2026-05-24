import { describe, expect, it } from "vitest"
import { buildTradePayload, tradeClosingFeeForForm } from "./trade-form-utils"
import type { Trade } from "@/lib/types"

describe("tradeClosingFeeForForm", () => {
  it("prefers closing_fee", () => {
    const trade = {
      closing_fee: "0.15",
      trading_fee: "1",
      fee: "2",
    } as Trade
    expect(tradeClosingFeeForForm(trade)).toBe("0.15")
  })

  it("falls back to trading_fee then legacy fee", () => {
    expect(
      tradeClosingFeeForForm({ closing_fee: "0", trading_fee: "0.20", fee: "0" } as Trade),
    ).toBe("0.2")
    expect(tradeClosingFeeForForm({ closing_fee: "0", trading_fee: "0", fee: "0.10" } as Trade)).toBe(
      "0.10",
    )
  })
})

describe("buildTradePayload", () => {
  it("sends only closing_fee", () => {
    const payload = buildTradePayload({
      date: "2026-06-01",
      ticker: "aapl",
      asset_type: "stock",
      side: "buy",
      quantity: "1",
      price: "100",
      closing_fee: "0.15",
      notes: "",
    })
    expect(payload.closing_fee).toBe("0.15")
    expect(payload).not.toHaveProperty("deposit_fee")
    expect(payload).not.toHaveProperty("transaction_fx_rate")
  })
})
