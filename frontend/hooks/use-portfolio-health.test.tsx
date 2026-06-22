import { describe, expect, it, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { NetWorthData, Holding } from "@/lib/types"
import type { FxRateChartPoint } from "@/lib/api/analytics"
import { usePortfolioHealth } from "./use-portfolio-health"
import { queryKeys } from "@/lib/api/query-keys"

function makeNetWorth(overrides?: Partial<NetWorthData>): NetWorthData {
  return {
    holdings_value: "10000.00",
    cash_balance: "2000.00",
    net_worth: "12000.00",
    total_invested: "10000.00",
    total_fees: "50.00",
    total_gain_loss: "2000.00",
    total_gain_loss_pct: "20.00",
    xirr: "0",
    breakdown: {
      by_asset_type: { etf: "6000.00", stock: "4000.00" },
      by_ticker: { AAPL: "3000.00", VOO: "6000.00", META: "1000.00" },
    },
    ...overrides,
  }
}

function makeHolding(overrides?: Partial<Holding>): Holding {
  return {
    ticker: "AAPL",
    assetType: "stock",
    quantity: "10",
    avgCost: "150.00",
    totalInvested: "1500.00",
    marketValue: "1800.00",
    unrealizedPL: "300.00",
    unrealizedPLPercent: "20.00",
    priceAsOf: new Date().toISOString(),
    ...overrides,
  }
}

function makeHoldings(): Holding[] {
  return [
    makeHolding({ ticker: "AAPL", unrealizedPLPercent: "5.00", priceAsOf: new Date().toISOString() }),
    makeHolding({ ticker: "VOO", unrealizedPLPercent: "2.50", priceAsOf: new Date().toISOString() }),
  ]
}

function makeFxChart(daysAgo: number, latestRate: string, oldRate: string): FxRateChartPoint[] {
  const now = new Date()
  const points: FxRateChartPoint[] = []
  for (let i = daysAgo; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    points.push({
      date: d.toISOString().split("T")[0],
      rate: i === 0 ? latestRate : i === daysAgo ? oldRate : latestRate,
    })
  }
  return points
}

function wrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe("usePortfolioHealth", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  describe("concentration risk", () => {
    it("returns a warning when a single ticker exceeds 30% of net worth", () => {
      const data = makeNetWorth({
        breakdown: {
          by_asset_type: {},
          by_ticker: { AAPL: "6000.00", VOO: "3000.00", TSLA: "1000.00" },
        },
      })
      // net_worth is 12000, AAPL is 6000 = 50% → should trigger

      queryClient.setQueryData(queryKeys.netWorth(), data)
      const { result } = renderHook(() => usePortfolioHealth(), {
        wrapper: wrapper(queryClient),
      })

      const concAlert = result.current.alerts.find((a) => a.type === "concentration")
      expect(concAlert).toBeDefined()
      expect(concAlert?.severity).toBe("warning")
      expect(concAlert?.message).toContain("AAPL")
      expect(concAlert?.message).toContain("50%")
    })

    it("returns no alert when all ticker concentrations are below 30%", () => {
      const data = makeNetWorth({
        breakdown: {
          by_asset_type: {},
          by_ticker: { AAPL: "3000.00", VOO: "3000.00", TSLA: "2000.00", MSFT: "2000.00" },
        },
      })
      // net_worth is 12000, max ticker is 3000 = 25%

      queryClient.setQueryData(queryKeys.netWorth(), data)
      const { result } = renderHook(() => usePortfolioHealth(), {
        wrapper: wrapper(queryClient),
      })

      const concAlert = result.current.alerts.find((a) => a.type === "concentration")
      expect(concAlert).toBeUndefined()
    })
  })

  describe("large unrealized move", () => {
    it("returns a warning when a holding has > 20% unrealized gain", () => {
      queryClient.setQueryData(queryKeys.netWorth(), makeNetWorth())
      queryClient.setQueryData(["holdings"], [
        makeHolding({ ticker: "TSLA", unrealizedPLPercent: "35.50" }),
      ])

      const { result } = renderHook(() => usePortfolioHealth(), {
        wrapper: wrapper(queryClient),
      })

      const moveAlert = result.current.alerts.find((a) => a.type === "large_move")
      expect(moveAlert).toBeDefined()
      expect(moveAlert?.severity).toBe("warning")
      expect(moveAlert?.message).toContain("TSLA")
      expect(moveAlert?.message).toContain("+35.5%")
    })

    it("returns a warning when a holding has > 15% unrealized loss", () => {
      queryClient.setQueryData(queryKeys.netWorth(), makeNetWorth())
      queryClient.setQueryData(["holdings"], [
        makeHolding({ ticker: "AAPL", unrealizedPLPercent: "-18.20" }),
      ])

      const { result } = renderHook(() => usePortfolioHealth(), {
        wrapper: wrapper(queryClient),
      })

      const moveAlert = result.current.alerts.find((a) => a.type === "large_move")
      expect(moveAlert).toBeDefined()
      expect(moveAlert?.severity).toBe("warning")
      expect(moveAlert?.message).toContain("-18.2%")
    })

    it("returns no alert when all moves are within ±15%", () => {
      queryClient.setQueryData(queryKeys.netWorth(), makeNetWorth())
      queryClient.setQueryData(["holdings"], makeHoldings())

      const { result } = renderHook(() => usePortfolioHealth(), {
        wrapper: wrapper(queryClient),
      })

      const moveAlert = result.current.alerts.find((a) => a.type === "large_move")
      expect(moveAlert).toBeUndefined()
    })
  })

  describe("stale market prices", () => {
    it("returns a warning when any price is older than 24 hours", () => {
      const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
      queryClient.setQueryData(queryKeys.netWorth(), makeNetWorth())
      queryClient.setQueryData(["holdings"], [
        makeHolding({ ticker: "AAPL", priceAsOf: new Date().toISOString() }),
        makeHolding({ ticker: "VOO", priceAsOf: staleDate }),
      ])

      const { result } = renderHook(() => usePortfolioHealth(), {
        wrapper: wrapper(queryClient),
      })

      const staleAlert = result.current.alerts.find((a) => a.type === "stale_prices")
      expect(staleAlert).toBeDefined()
      expect(staleAlert?.severity).toBe("warning")
      expect(staleAlert?.message).toContain("stale")
    })

    it("returns no alert when all prices are fresh", () => {
      queryClient.setQueryData(queryKeys.netWorth(), makeNetWorth())
      queryClient.setQueryData(["holdings"], makeHoldings())

      const { result } = renderHook(() => usePortfolioHealth(), {
        wrapper: wrapper(queryClient),
      })

      const staleAlert = result.current.alerts.find((a) => a.type === "stale_prices")
      expect(staleAlert).toBeUndefined()
    })
  })

  describe("low buying power", () => {
    it("returns a warning when cash balance is below 2% of net worth", () => {
      queryClient.setQueryData(
        queryKeys.netWorth(),
        makeNetWorth({ cash_balance: "100.00", net_worth: "12000.00" }),
      )

      const { result } = renderHook(() => usePortfolioHealth(), {
        wrapper: wrapper(queryClient),
      })

      const bpAlert = result.current.alerts.find((a) => a.type === "low_buying_power")
      expect(bpAlert).toBeDefined()
      expect(bpAlert?.severity).toBe("warning")
      expect(bpAlert?.message).toContain("buying power")
    })

    it("returns no alert when cash balance is above 2% of net worth", () => {
      queryClient.setQueryData(
        queryKeys.netWorth(),
        makeNetWorth({ cash_balance: "2000.00", net_worth: "12000.00" }),
      )

      const { result } = renderHook(() => usePortfolioHealth(), {
        wrapper: wrapper(queryClient),
      })

      const bpAlert = result.current.alerts.find((a) => a.type === "low_buying_power")
      expect(bpAlert).toBeUndefined()
    })
  })

  describe("sharp FX move", () => {
    it("returns an info alert when COP/USD moved more than 4% in 7 days", () => {
      // Use a balanced breakdown so no higher-severity concentration alert wins.
      queryClient.setQueryData(
        queryKeys.netWorth(),
        makeNetWorth({
          net_worth: "20000.00",
          breakdown: {
            by_asset_type: { etf: "10000.00", stock: "5000.00" },
            by_ticker: { AAPL: "5000.00", VOO: "5000.00", META: "5000.00" },
          },
        }),
      )
      queryClient.setQueryData(queryKeys.fxRateChart(7), makeFxChart(7, "4300", "4000"))

      const { result } = renderHook(() => usePortfolioHealth(), {
        wrapper: wrapper(queryClient),
      })

      const fxAlert = result.current.alerts.find((a) => a.type === "fx_move")
      expect(fxAlert).toBeDefined()
      expect(fxAlert?.severity).toBe("info")
    })

    it("returns no alert when FX move is within 4%", () => {
      queryClient.setQueryData(queryKeys.netWorth(), makeNetWorth())
      queryClient.setQueryData(queryKeys.fxRateChart(7), makeFxChart(7, "4127", "4100"))

      const { result } = renderHook(() => usePortfolioHealth(), {
        wrapper: wrapper(queryClient),
      })

      const fxAlert = result.current.alerts.find((a) => a.type === "fx_move")
      expect(fxAlert).toBeUndefined()
    })
  })

  describe("priority ordering", () => {
    it("returns only the highest-priority alert when multiple exist", () => {
      const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
      queryClient.setQueryData(
        queryKeys.netWorth(),
        makeNetWorth({
          cash_balance: "50.00",
          breakdown: {
            by_asset_type: {},
            by_ticker: { AAPL: "6000.00" },
          },
        }),
      )
      queryClient.setQueryData(["holdings"], [
        makeHolding({ ticker: "AAPL", priceAsOf: staleDate, unrealizedPLPercent: "-22.00" }),
      ])
      queryClient.setQueryData(queryKeys.fxRateChart(7), makeFxChart(7, "4300", "4000"))

      const { result } = renderHook(() => usePortfolioHealth(), {
        wrapper: wrapper(queryClient),
      })

      // Multiple alerts should be detected but filtered by priority
      // large_move (AAPL -22%) and concentration (AAPL 50%) both exist
      // Priority: warning > info, both are warning, so we keep the highest severity ones
      expect(result.current.alerts.length).toBeGreaterThanOrEqual(1)
      // All returned alerts should be "warning" severity (filtered out info-only ones)
      expect(result.current.alerts.every((a) => a.severity === "warning")).toBe(true)
    })
  })

  describe("dismiss", () => {
    it("removes a dismissed alert type", () => {
      const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
      queryClient.setQueryData(queryKeys.netWorth(), makeNetWorth())
      queryClient.setQueryData(["holdings"], [
        makeHolding({ ticker: "AAPL", priceAsOf: staleDate }),
      ])

      const { result } = renderHook(() => usePortfolioHealth(), {
        wrapper: wrapper(queryClient),
      })

      expect(result.current.alerts.some((a) => a.type === "stale_prices")).toBe(true)

      act(() => {
        result.current.dismiss("stale_prices")
      })

      expect(result.current.alerts.some((a) => a.type === "stale_prices")).toBe(false)
    })
  })
})
