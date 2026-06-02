import { describe, expect, it } from "vitest"
import {
  applyTradeDatePreset,
  DEFAULT_TRADE_FILTERS,
  filterTrades,
  formatTradeDateRangeLabel,
  hasActiveFilters,
  normalizeTradeDateRange,
  parseTradeFiltersFromSearchParams,
  tradeFiltersToApiParams,
  tradeFiltersToSearchParams,
} from "./trade-filters"
import type { Trade } from "@/lib/types"

function makeTrade(overrides: Partial<Trade>): Trade {
  return {
    id: "1",
    user_id: "u",
    date: "2025-06-15",
    ticker: "AAPL",
    asset_type: "stock",
    side: "buy",
    quantity: "1",
    price: "100",
    deposit_fee: "0",
    trading_fee: "0",
    closing_fee: "0",
    total_fees: "0",
    total: "100",
    notes: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  }
}

const REF = new Date(2026, 4, 25)

describe("normalizeTradeDateRange", () => {
  it("swaps inverted from/to", () => {
    expect(normalizeTradeDateRange({ from: "2026-03-10", to: "2026-03-01" })).toEqual({
      from: "2026-03-01",
      to: "2026-03-10",
    })
  })
})

describe("applyTradeDatePreset", () => {
  it("returns YTD through reference day", () => {
    expect(applyTradeDatePreset("ytd", REF)).toEqual({
      from: "2026-01-01",
      to: "2026-05-25",
    })
  })

  it("returns last 12 months through reference day", () => {
    expect(applyTradeDatePreset("12m", REF)).toEqual({
      from: "2025-05-25",
      to: "2026-05-25",
    })
  })

  it("returns last 30 days through reference day", () => {
    expect(applyTradeDatePreset("last30d", REF)).toEqual({
      from: "2026-04-25",
      to: "2026-05-25",
    })
  })
})

describe("formatTradeDateRangeLabel", () => {
  it("shows All dates when empty", () => {
    expect(formatTradeDateRangeLabel({ from: null, to: null })).toBe("All dates")
  })

  it("shows a single formatted day", () => {
    expect(formatTradeDateRangeLabel({ from: "2026-03-01", to: null })).toContain("2026")
  })

  it("shows an en-dash range", () => {
    const label = formatTradeDateRangeLabel({ from: "2026-03-01", to: "2026-03-31" })
    expect(label).toContain("–")
  })
})

describe("filterTrades", () => {
  const trades = [
    makeTrade({ id: "1", side: "buy", asset_type: "stock", date: "2026-03-01" }),
    makeTrade({ id: "2", side: "sell", asset_type: "etf", date: "2025-11-01", ticker: "VOO" }),
    makeTrade({ id: "3", side: "buy", asset_type: "etf", date: "2024-01-01" }),
  ]

  it("returns all trades when filters are default", () => {
    expect(filterTrades(trades, DEFAULT_TRADE_FILTERS)).toHaveLength(3)
  })

  it("filters by side", () => {
    expect(filterTrades(trades, { ...DEFAULT_TRADE_FILTERS, side: "sell" })).toHaveLength(1)
    expect(filterTrades(trades, { ...DEFAULT_TRADE_FILTERS, side: "sell" })[0].ticker).toBe("VOO")
  })

  it("filters by asset type", () => {
    expect(filterTrades(trades, { ...DEFAULT_TRADE_FILTERS, assetType: "etf" })).toHaveLength(2)
  })

  it("filters by a single calendar day", () => {
    const result = filterTrades(trades, {
      ...DEFAULT_TRADE_FILTERS,
      dateRange: { from: "2026-03-01", to: null },
    })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("1")
  })

  it("filters by an inclusive date range", () => {
    const result = filterTrades(trades, {
      ...DEFAULT_TRADE_FILTERS,
      dateRange: { from: "2025-01-01", to: "2026-12-31" },
    })
    expect(result).toHaveLength(2)
    expect(result.map((t) => t.id)).toEqual(["1", "2"])
  })

  it("combines filters with AND", () => {
    const result = filterTrades(trades, {
      side: "buy",
      assetType: "etf",
      dateRange: { from: "2024-01-01", to: "2024-12-31" },
      ticker: null,
    })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("3")
  })

  it("filters by ticker (case-insensitive exact match)", () => {
    const result = filterTrades(trades, { ...DEFAULT_TRADE_FILTERS, ticker: "voo" })
    expect(result).toHaveLength(1)
    expect(result[0].ticker).toBe("VOO")
  })

  it("filters by crypto asset type", () => {
    const cryptoTrades = [
      ...trades,
      makeTrade({ id: "4", asset_type: "crypto", ticker: "BTC", date: "2026-01-01" }),
    ]
    expect(
      filterTrades(cryptoTrades, { ...DEFAULT_TRADE_FILTERS, assetType: "crypto" }),
    ).toHaveLength(1)
  })
})

describe("parseTradeFiltersFromSearchParams", () => {
  it("parses URL filter params", () => {
    expect(
      parseTradeFiltersFromSearchParams({
        side: "buy",
        asset: "etf",
        from: "2026-01-01",
        to: "2026-01-31",
        ticker: "aapl",
      }),
    ).toEqual({
      side: "buy",
      assetType: "etf",
      dateRange: { from: "2026-01-01", to: "2026-01-31" },
      ticker: "AAPL",
    })
  })

  it("returns defaults for missing params", () => {
    expect(parseTradeFiltersFromSearchParams({})).toEqual(DEFAULT_TRADE_FILTERS)
  })
})

describe("tradeFiltersToSearchParams", () => {
  it("serializes active filters", () => {
    const params = tradeFiltersToSearchParams({
      side: "sell",
      assetType: "stock",
      dateRange: { from: "2026-03-01", to: null },
      ticker: "MSFT",
    })
    expect(params.get("side")).toBe("sell")
    expect(params.get("asset")).toBe("stock")
    expect(params.get("from")).toBe("2026-03-01")
    expect(params.get("ticker")).toBe("MSFT")
  })
})

describe("tradeFiltersToApiParams", () => {
  it("maps filters to API query fields", () => {
    expect(
      tradeFiltersToApiParams({
        side: "buy",
        assetType: "crypto",
        dateRange: { from: "2026-01-01", to: null },
        ticker: "BTC",
      }),
    ).toEqual({
      side: "buy",
      asset_type: "crypto",
      from: "2026-01-01",
      to: "2026-01-01",
      ticker: "BTC",
    })
  })
})

describe("hasActiveFilters", () => {
  it("is false for defaults", () => {
    expect(hasActiveFilters(DEFAULT_TRADE_FILTERS)).toBe(false)
  })

  it("is true when date range is set", () => {
    expect(
      hasActiveFilters({
        ...DEFAULT_TRADE_FILTERS,
        dateRange: { from: "2026-01-01", to: null },
      }),
    ).toBe(true)
  })

  it("is true when any dimension is narrowed", () => {
    expect(hasActiveFilters({ ...DEFAULT_TRADE_FILTERS, side: "buy" })).toBe(true)
  })

  it("is true when ticker is set", () => {
    expect(hasActiveFilters({ ...DEFAULT_TRADE_FILTERS, ticker: "AAPL" })).toBe(true)
  })
})
