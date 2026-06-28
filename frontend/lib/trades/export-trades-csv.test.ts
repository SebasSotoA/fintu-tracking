import { describe, expect, it } from "vitest"
import { escapeCsvField, tradesToCsv } from "./export-trades-csv"
import type { Trade } from "@/lib/types"

function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: "1",
    user_id: "u",
    date: "2026-03-01",
    ticker: "AAPL",
    asset_type: "stock",
    side: "buy",
    quantity: "10",
    price: "150",
    deposit_fee: "0",
    trading_fee: "0",
    closing_fee: "0",
    total_fees: "1",
    total: "1501",
    broker_id: null,
    notes: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  }
}

describe("escapeCsvField", () => {
  it("returns plain values unchanged", () => {
    expect(escapeCsvField("AAPL")).toBe("AAPL")
  })

  it("wraps values containing commas in quotes", () => {
    expect(escapeCsvField('note, "special"')).toBe('"note, ""special"""')
  })
})

describe("tradesToCsv", () => {
  it("includes header and one data row", () => {
    const csv = tradesToCsv([makeTrade()])
    const lines = csv.split("\n")
    expect(lines[0]).toBe("date,ticker,side,quantity,price,fees,total")
    expect(lines[1]).toBe("2026-03-01,AAPL,buy,10,150,1,1501")
  })

  it("escapes ticker values with commas", () => {
    const csv = tradesToCsv([makeTrade({ ticker: "BRK,B" })])
    expect(csv).toContain('"BRK,B"')
  })
})
