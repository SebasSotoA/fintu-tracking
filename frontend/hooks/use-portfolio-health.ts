"use client"

import { useState, useMemo, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { Decimal } from "@/lib/decimal"
import { apiClient } from "@/lib/api/client"
import { queryKeys } from "@/lib/api/query-keys"
import { MARKET_CONFIG, formatCurrencyPair } from "@/lib/market-config/market-config"
import type { NetWorthData, Holding } from "@/lib/types"
import type { FxRateChartPoint } from "@/lib/api/analytics"
import { getHoldings } from "@/lib/api/portfolio"
import { getFxRateChart } from "@/lib/api/analytics"
import { useLocale } from "@/components/locale-provider"
import type { InterpolationVars, MessageKey } from "@/lib/i18n/types"

type Translate = (key: MessageKey, vars?: InterpolationVars) => string

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

const CONCENTRATION_THRESHOLD = 30
const LARGE_MOVE_GAIN_THRESHOLD = 20
const LARGE_MOVE_LOSS_THRESHOLD = 15
const STALE_HOURS = 24
const LOW_BUYING_POWER_THRESHOLD = 2
const FX_MOVE_THRESHOLD = 4
const FX_LOOKBACK_DAYS = 7

const SEVERITY_ORDER: Record<HealthSeverity, number> = {
  destructive: 0,
  warning: 1,
  info: 2,
}

export function usePortfolioHealth(): PortfolioHealthResult {
  const { t } = useLocale()
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

    const conc = netWorth ? checkConcentration(netWorth, t) : null
    if (conc) candidates.push(conc)

    const move = holdings ? checkLargeMove(holdings, t) : null
    if (move) candidates.push(move)

    const stale = holdings ? checkStalePrices(holdings, t) : null
    if (stale) candidates.push(stale)

    const bp = netWorth ? checkLowBuyingPower(netWorth, t) : null
    if (bp) candidates.push(bp)

    const fx = fxChart ? checkFXMove(fxChart, t) : null
    if (fx) candidates.push(fx)

    const active = candidates.filter((a) => !dismissed.has(a.type))

    active.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])

    if (active.length > 0) {
      const topSeverity = active[0].severity
      return active.filter((a) => a.severity === topSeverity)
    }

    return []
  }, [netWorth, holdings, fxChart, dismissed, t])

  const dismiss = useCallback((type: HealthAlertType) => {
    setDismissed((prev) => new Set(prev).add(type))
  }, [])

  return { alerts, dismiss }
}

function toPriceTimestamp(value: string | null | undefined): number {
  if (!value) return 0
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
}

function isStale(value: string | null | undefined): boolean {
  const ts = toPriceTimestamp(value)
  if (!ts) return true
  return Date.now() - ts > STALE_HOURS * 60 * 60 * 1000
}

function percentString(numerator: string, denominator: string): string {
  const num = new Decimal(numerator)
  const den = new Decimal(denominator)
  if (den.isZero()) return "0"
  return num.div(den).mul(100).toFixed(0)
}

function checkConcentration(netWorth: NetWorthData, t: Translate): HealthAlert | null {
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
      message: t("dashboard.health.concentration", {
        ticker: maxTicker,
        pct: percentString(byTicker[maxTicker], netWorth.net_worth),
      }),
      details: t("dashboard.health.concentrationDetails", {
        threshold: CONCENTRATION_THRESHOLD,
      }),
    }
  }

  return null
}

function checkLargeMove(holdings: Holding[], t: Translate): HealthAlert | null {
  if (!holdings?.length) return null

  for (const h of holdings) {
    const pct = Math.abs(Number(h.unrealizedPLPercent || 0))
    const isNegative = Number(h.unrealizedPLPercent || 0) < 0
    const threshold = isNegative ? LARGE_MOVE_LOSS_THRESHOLD : LARGE_MOVE_GAIN_THRESHOLD

    if (pct >= threshold) {
      const formattedPL = Number(h.unrealizedPL || 0).toFixed(2)
      const vars = { ticker: h.ticker, pct: pct.toFixed(1) }
      return {
        type: "large_move",
        severity: "warning",
        message: isNegative
          ? t("dashboard.health.largeMoveLoss", vars)
          : t("dashboard.health.largeMoveGain", vars),
        details: isNegative
          ? t("dashboard.health.largeMoveDetailsLoss", {
              ticker: h.ticker,
              amount: formattedPL,
              currency: MARKET_CONFIG.baseCurrency,
            })
          : t("dashboard.health.largeMoveDetailsGain", {
              ticker: h.ticker,
              amount: formattedPL,
              currency: MARKET_CONFIG.baseCurrency,
            }),
        direction: isNegative ? "down" : "up",
      }
    }
  }

  return null
}

function checkStalePrices(holdings: Holding[], t: Translate): HealthAlert | null {
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
          ? t("dashboard.health.staleAll")
          : t("dashboard.health.staleSome", {
              stale: staleCount,
              total: holdings.length,
            }),
      details: t("dashboard.health.staleDetails"),
    }
  }

  return null
}

function checkLowBuyingPower(netWorth: NetWorthData, t: Translate): HealthAlert | null {
  const cash = new Decimal(netWorth.cash_balance || "0")
  const worth = new Decimal(netWorth.net_worth || "0")

  if (worth.isZero()) return null

  const pct = cash.div(worth).mul(100)
  if (pct.lt(LOW_BUYING_POWER_THRESHOLD)) {
    const cashFormatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: MARKET_CONFIG.baseCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cash.toNumber())

    return {
      type: "low_buying_power",
      severity: "warning",
      message: t("dashboard.health.lowBuyingPower", {
        cash: cashFormatted,
        pct: pct.toFixed(0),
        currency: MARKET_CONFIG.localCurrency,
      }),
      details: t("dashboard.health.lowBuyingPowerDetails", {
        threshold: LOW_BUYING_POWER_THRESHOLD,
      }),
    }
  }

  return null
}

function checkFXMove(fxChart: FxRateChartPoint[], t: Translate): HealthAlert | null {
  if (!fxChart?.length || fxChart.length < 2) return null

  const sorted = [...fxChart].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )
  const oldest = new Decimal(sorted[0].rate)
  const latest = new Decimal(sorted[sorted.length - 1].rate)

  if (oldest.isZero()) return null

  const changePct = latest.sub(oldest).div(oldest).mul(100).abs()
  if (changePct.gte(FX_MOVE_THRESHOLD)) {
    const pair = formatCurrencyPair(MARKET_CONFIG.localCurrency, MARKET_CONFIG.baseCurrency)
    const vars = {
      pair,
      pct: changePct.toFixed(1),
      currency: MARKET_CONFIG.localCurrency,
    }
    return {
      type: "fx_move",
      severity: "info",
      message: latest.gte(oldest)
        ? t("dashboard.health.fxStrengthened", vars)
        : t("dashboard.health.fxWeakened", vars),
      details: t("dashboard.health.fxDetails", {
        oldest: oldest.toFixed(2),
        latest: latest.toFixed(2),
        days: FX_LOOKBACK_DAYS,
      }),
    }
  }

  return null
}
