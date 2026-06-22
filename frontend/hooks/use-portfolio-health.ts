"use client"

import { useState, useMemo, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { Decimal } from "@/lib/decimal"
import { apiClient } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import type { NetWorthData, Holding } from "@/lib/types"
import type { FxRateChartPoint } from "@/lib/api/analytics"
import { getHoldings } from "@/lib/api/portfolio"
import { getFxRateChart } from "@/lib/api/analytics"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HealthAlertType =
  | "concentration"
  | "large_move"
  | "stale_prices"
  | "low_buying_power"
  | "fx_move"

export type HealthSeverity = "info" | "warning" | "destructive"

export interface HealthAlert {
  type: HealthAlertType
  severity: HealthSeverity
  message: string
  details?: string
  /** Direction hint for large_move alerts — the banner picks the icon from this. */
  direction?: "up" | "down"
}

export interface PortfolioHealthResult {
  alerts: HealthAlert[]
  dismiss: (type: HealthAlertType) => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONCENTRATION_THRESHOLD = 30 // percent of net_worth
const LARGE_MOVE_GAIN_THRESHOLD = 20 // percent unrealized gain
const LARGE_MOVE_LOSS_THRESHOLD = 15 // percent unrealized loss (absolute)
const STALE_HOURS = 24
const LOW_BUYING_POWER_THRESHOLD = 2 // percent of net_worth
const FX_MOVE_THRESHOLD = 4 // percent change over FX_LOOKBACK_DAYS
const FX_LOOKBACK_DAYS = 7

const SEVERITY_ORDER: Record<HealthSeverity, number> = {
  destructive: 0,
  warning: 1,
  info: 2,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toPriceTimestamp(value: string | null | undefined): number {
  if (!value) return 0
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
}

function isStale(value: string | null | undefined): boolean {
  const ts = toPriceTimestamp(value)
  if (!ts) return true // missing timestamp = stale
  return Date.now() - ts > STALE_HOURS * 60 * 60 * 1000
}

function percentString(numerator: string, denominator: string): string {
  const num = new Decimal(numerator)
  const den = new Decimal(denominator)
  if (den.isZero()) return "0"
  return num.div(den).mul(100).toFixed(0)
}

// ---------------------------------------------------------------------------
// Alert detectors — each returns a HealthAlert | null
// ---------------------------------------------------------------------------

function checkConcentration(netWorth: NetWorthData): HealthAlert | null {
  const byTicker = netWorth.breakdown?.by_ticker
  if (!byTicker) return null

  const worth = new Decimal(netWorth.net_worth)
  let maxPct = 0
  let maxTicker = ""

  for (const [ticker, value] of Object.entries(byTicker)) {
    const pct = new Decimal(value).div(worth).mul(100)
    if (pct.gt(maxPct)) {
      maxPct = pct.toNumber()
      maxTicker = ticker
    }
  }

  if (maxPct >= CONCENTRATION_THRESHOLD) {
    return {
      type: "concentration",
      severity: "warning",
      message: `${maxTicker} represents ${percentString(byTicker[maxTicker], netWorth.net_worth)}% of your portfolio — consider diversifying.`,
      details: `A single position exceeding ${CONCENTRATION_THRESHOLD}% introduces concentration risk.`,
    }
  }

  return null
}

function checkLargeMove(holdings: Holding[]): HealthAlert | null {
  if (!holdings?.length) return null

  for (const h of holdings) {
    const pct = Math.abs(Number(h.unrealizedPLPercent || 0))
    const isNegative = Number(h.unrealizedPLPercent || 0) < 0
    const threshold = isNegative ? LARGE_MOVE_LOSS_THRESHOLD : LARGE_MOVE_GAIN_THRESHOLD

    if (pct >= threshold) {
      const sign = isNegative ? "-" : "+"
      const formattedPL = Number(h.unrealizedPL || 0).toFixed(2)
      return {
        type: "large_move",
        severity: "warning",
        message: `${h.ticker} ${sign}${pct.toFixed(1)}% unrealized — ${isNegative ? "consider reviewing this position." : "consider taking profits."}`,
        details: `Unrealized ${isNegative ? "loss" : "gain"} on ${h.ticker}: ${formattedPL} USD.`,
        direction: isNegative ? "down" : "up",
      }
    }
  }

  return null
}

function checkStalePrices(holdings: Holding[]): HealthAlert | null {
  if (!holdings?.length) return null

  const staleCount = holdings.filter(
    (h) => isStale(h.priceAsOf ?? h.price_as_of ?? h.market_price_updated_at),
  ).length

  if (staleCount > 0) {
    return {
      type: "stale_prices",
      severity: "warning",
      message:
        staleCount === holdings.length
          ? "All market prices are stale (>24h). Click Refresh Prices to update."
          : `${staleCount} of ${holdings.length} market prices are stale (>24h). Click Refresh Prices to update.`,
      details: "Prices older than 24 hours may not reflect current market value.",
    }
  }

  return null
}

function checkLowBuyingPower(netWorth: NetWorthData): HealthAlert | null {
  const cash = new Decimal(netWorth.cash_balance || "0")
  const worth = new Decimal(netWorth.net_worth || "0")

  if (worth.isZero()) return null

  const pct = cash.div(worth).mul(100)
  if (pct.lt(LOW_BUYING_POWER_THRESHOLD)) {
    const cashFormatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cash.toNumber())

    return {
      type: "low_buying_power",
      severity: "warning",
      message: `You have ${cashFormatted} buying power (${pct.toFixed(0)}% of portfolio) — consider depositing more COP to seize opportunities.`,
      details: `Buying power below ${LOW_BUYING_POWER_THRESHOLD}% limits your ability to act on market moves.`,
    }
  }

  return null
}

function checkFXMove(fxChart: FxRateChartPoint[]): HealthAlert | null {
  if (!fxChart?.length || fxChart.length < 2) return null

  const sorted = [...fxChart].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )
  const oldest = new Decimal(sorted[0].rate)
  const latest = new Decimal(sorted[sorted.length - 1].rate)

  if (oldest.isZero()) return null

  const changePct = latest.sub(oldest).div(oldest).mul(100).abs()
  if (changePct.gte(FX_MOVE_THRESHOLD)) {
    const direction = latest.gte(oldest) ? "strengthened" : "weakened"
    return {
      type: "fx_move",
      severity: "info",
      message: `COP/USD ${direction} ${changePct.toFixed(1)}% this week — your COP-valued returns are affected.`,
      details: `Rate went from ${oldest.toFixed(2)} to ${latest.toFixed(2)} in ${FX_LOOKBACK_DAYS} days.`,
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePortfolioHealth(): PortfolioHealthResult {
  const [dismissed, setDismissed] = useState<Set<HealthAlertType>>(new Set())

  const { data: netWorth } = useQuery<NetWorthData>({
    queryKey: queryKeys.netWorth(),
    queryFn: () => apiClient.get<NetWorthData>("/api/analytics/net-worth"),
    staleTime: 120_000,
  })

  const { data: holdings } = useQuery<Holding[]>({
    queryKey: ["holdings"],
    queryFn: () => getHoldings(),
    staleTime: 120_000,
  })

  const { data: fxChart } = useQuery<FxRateChartPoint[]>({
    queryKey: queryKeys.fxRateChart(FX_LOOKBACK_DAYS),
    queryFn: () => getFxRateChart(FX_LOOKBACK_DAYS),
    staleTime: 300_000,
  })

  const alerts = useMemo((): HealthAlert[] => {
    const candidates: HealthAlert[] = []

    const conc = netWorth ? checkConcentration(netWorth) : null
    if (conc) candidates.push(conc)

    const move = holdings ? checkLargeMove(holdings) : null
    if (move) candidates.push(move)

    const stale = holdings ? checkStalePrices(holdings) : null
    if (stale) candidates.push(stale)

    const bp = netWorth ? checkLowBuyingPower(netWorth) : null
    if (bp) candidates.push(bp)

    const fx = fxChart ? checkFXMove(fxChart) : null
    if (fx) candidates.push(fx)

    // Filter dismissed
    const active = candidates.filter((a) => !dismissed.has(a.type))

    // Sort by severity (destructive first), then keep only the highest-priority level
    active.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])

    if (active.length > 0) {
      const topSeverity = active[0].severity
      return active.filter((a) => a.severity === topSeverity)
    }

    return []
  }, [netWorth, holdings, fxChart, dismissed])

  const dismiss = useCallback((type: HealthAlertType) => {
    setDismissed((prev) => new Set(prev).add(type))
  }, [])

  return { alerts, dismiss }
}
