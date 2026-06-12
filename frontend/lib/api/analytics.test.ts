import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  buildDateRangeSearchParams,
  parseFeeEfficiency,
  getNetWorth,
  getReturnAttribution,
  getFeeBreakdown,
  getPerformanceTimeSeries,
  getFxImpact,
  getFeeEfficiency,
  getFxRateChart,
  getStandaloneFeesUsd,
  getTransferFeesPaidUsd,
  type CashBreakdown,
} from "./analytics"

vi.mock("./client", () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

import { apiClient } from "./client"

const mockGet = vi.mocked(apiClient.get)

function baseBreakdown(overrides: Partial<CashBreakdown> = {}): CashBreakdown {
  return {
    deposits_usd: "0",
    withdrawals_usd: "0",
    fees_usd: "0",
    cash_flows_net_usd: "0",
    trade_buys_usd: "0",
    trade_sells_usd: "0",
    trade_net_usd: "0",
    cash_balance: "0",
    ...overrides,
  }
}

describe("cash breakdown fee helpers", () => {
  it("getStandaloneFeesUsd prefers standalone_fees_usd over fees_usd", () => {
    expect(
      getStandaloneFeesUsd(
        baseBreakdown({ standalone_fees_usd: "5.00", fees_usd: "10.00" }),
      ),
    ).toBe("5.00")
  })

  it("getStandaloneFeesUsd falls back to fees_usd", () => {
    expect(getStandaloneFeesUsd(baseBreakdown({ fees_usd: "3.50" }))).toBe("3.50")
  })

  it("getTransferFeesPaidUsd prefers transfer_fees_paid_usd", () => {
    expect(
      getTransferFeesPaidUsd(
        baseBreakdown({
          transfer_fees_paid_usd: "12.00",
          transfer_fees_usd: "8.00",
          fees_usd: "4.00",
        }),
      ),
    ).toBe("12.00")
  })

  it("getTransferFeesPaidUsd falls back to transfer_fees_usd then zero", () => {
    expect(getTransferFeesPaidUsd(baseBreakdown({ transfer_fees_usd: "8.00" }))).toBe("8.00")
    expect(getTransferFeesPaidUsd(baseBreakdown())).toBe("0")
  })
})

describe("buildDateRangeSearchParams", () => {
  it("returns empty string when no range", () => {
    expect(buildDateRangeSearchParams()).toBe("")
  })

  it("includes start_date and end_date query params", () => {
    expect(
      buildDateRangeSearchParams({ startDate: "2025-01-01", endDate: "2025-12-31" }),
    ).toBe("start_date=2025-01-01&end_date=2025-12-31")
  })

  it("includes only provided bounds", () => {
    expect(buildDateRangeSearchParams({ startDate: "2025-06-01" })).toBe(
      "start_date=2025-06-01",
    )
  })
})

describe("parseFeeEfficiency", () => {
  it("returns empty by_ticker for invalid input", () => {
    expect(parseFeeEfficiency(null)).toEqual({ by_ticker: [] })
    expect(parseFeeEfficiency({})).toEqual({ by_ticker: [] })
  })

  it("parses valid by_ticker rows and drops malformed entries", () => {
    expect(
      parseFeeEfficiency({
        by_ticker: [
          {
            ticker: "AAPL",
            trade_count: "3",
            total_fees: "10.00",
            total_value: "1000.00",
            avg_fee_pct: "1.5",
          },
          { ticker: "BAD" },
        ],
      }),
    ).toEqual({
      by_ticker: [
        {
          ticker: "AAPL",
          trade_count: "3",
          total_fees: "10.00",
          total_value: "1000.00",
          avg_fee_pct: "1.5",
        },
      ],
    })
  })
})

describe("analytics client wrappers", () => {
  beforeEach(() => {
    mockGet.mockReset()
  })

  it("getNetWorth calls net-worth endpoint", async () => {
    mockGet.mockResolvedValue({ net_worth: "100" })
    await getNetWorth()
    expect(mockGet).toHaveBeenCalledWith("/api/analytics/net-worth")
  })

  it("getReturnAttribution calls return-attribution endpoint", async () => {
    mockGet.mockResolvedValue({ net_return_pct: "5" })
    await getReturnAttribution()
    expect(mockGet).toHaveBeenCalledWith("/api/analytics/return-attribution")
  })

  it("getFeeBreakdown appends date range query", async () => {
    mockGet.mockResolvedValue({ total_fees: "0" })
    await getFeeBreakdown({ startDate: "2025-01-01" })
    expect(mockGet).toHaveBeenCalledWith(
      "/api/analytics/fee-breakdown?start_date=2025-01-01",
    )
  })

  it("getPerformanceTimeSeries passes interval query", async () => {
    mockGet.mockResolvedValue([])
    await getPerformanceTimeSeries("month")
    expect(mockGet).toHaveBeenCalledWith(
      "/api/analytics/performance-time-series?interval=month",
    )
  })

  it("getFxImpact calls fx-impact endpoint", async () => {
    mockGet.mockResolvedValue({ fx_impact_usd: "0" })
    await getFxImpact()
    expect(mockGet).toHaveBeenCalledWith("/api/analytics/fx-impact")
  })

  it("getFeeEfficiency passes group_by and parses response", async () => {
    mockGet.mockResolvedValue({
      by_ticker: [
        {
          ticker: "VOO",
          trade_count: "1",
          total_fees: "2",
          total_value: "500",
          avg_fee_pct: "0.4",
        },
      ],
    })
    const result = await getFeeEfficiency("ticker")
    expect(mockGet).toHaveBeenCalledWith("/api/analytics/fee-efficiency?group_by=ticker")
    expect(result.by_ticker).toHaveLength(1)
    expect(result.by_ticker[0]?.ticker).toBe("VOO")
  })

  it("getFxRateChart delegates to fx-rates chart endpoint", async () => {
    mockGet.mockResolvedValue([{ date: "2026-01-01", rate: "4000" }])
    await getFxRateChart(90)
    expect(mockGet).toHaveBeenCalledWith("/api/fx-rates/chart?days=90")
  })
})
