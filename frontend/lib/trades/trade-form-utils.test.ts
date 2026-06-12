import { describe, expect, it } from "vitest"
import { buildTradePayload, calculateTradeTotal, tradeClosingFeeForForm } from "./trade-form-utils"
import type { Trade } from "@/lib/types"

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
    const payload = buildTradePayload({
      date: "2026-06-01",
      ticker: "aapl",
      asset_type: "stock",
      side: "buy",
      quantity: "1",
      price: "100",
      closing_fee: "0.15",
      notes: "",
      is_opening_position: false,
    })
    expect(payload.closing_fee).toBe("0.15")
    expect(payload).not.toHaveProperty("deposit_fee")
    expect(payload).not.toHaveProperty("transaction_fx_rate")
  })

  it("marks opening positions and omits closing fee", () => {
    const payload = buildTradePayload({
      date: "2026-06-01",
      ticker: "amd",
      asset_type: "stock",
      side: "buy",
      quantity: "5",
      price: "100",
      closing_fee: "2.00",
      notes: "Bought before tracking",
      is_opening_position: true,
    })

    expect(payload.is_opening_position).toBe(true)
    expect(payload).not.toHaveProperty("closing_fee")
  })
})

describe("calculateTradeTotal", () => {
  it("ignores commission for opening position buys", () => {
    expect(
      calculateTradeTotal({
        date: "2026-06-01",
        ticker: "AMD",
        asset_type: "stock",
        side: "buy",
        quantity: "2",
        price: "10",
        closing_fee: "1.50",
        notes: "seeded lot",
        is_opening_position: true,
      }),
    ).toBe("20.00")
  })
})
