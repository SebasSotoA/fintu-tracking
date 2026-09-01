"use client"

import type React from "react"
import { useQuery } from "@tanstack/react-query"
import Decimal from "decimal.js"
import { MetricLabel } from "@/components/analytics/metric-primitives"
import { getPerformanceTooltips } from "@/components/performance/performance-tooltips"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getFxImpact,
  getNetWorth,
  getReturnAttribution,
  type FxImpactReport,
  type ReturnAttribution,
} from "@/lib/api/analytics"
import { queryKeys } from "@/lib/api/query-keys"
import { MARKET_CONFIG, formatCurrencyPair } from "@/lib/market-config/market-config"
import type { NetWorthData } from "@/lib/types"
import { useLocale } from "@/components/locale-provider"

export interface PerformanceNowCardProps {
  initialNetWorth?: NetWorthData | null
}

function formatUSD(value: Decimal): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: MARKET_CONFIG.baseCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value.toNumber())
}

function formatSignedUSD(value: Decimal): string {
  const sign = value.greaterThanOrEqualTo(0) ? "+" : "−"
  return `${sign}${formatUSD(value.abs())}`
}

function formatCOP(value: Decimal): string {
  const formatted = new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value.toNumber())
  return `${MARKET_CONFIG.localCurrency} ${formatted}`
}

function formatRate(value: Decimal): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value.toNumber())
}

function formatSignedPct(value: Decimal): string {
  const sign = value.greaterThanOrEqualTo(0) ? "+" : "−"
  return `${sign}${value.abs().toFixed(2)}%`
}

function hasCopDeposit(value: string | undefined): boolean {
  return value != null && value !== ""
}

export function PerformanceNowCard({
  initialNetWorth = null,
}: PerformanceNowCardProps): React.JSX.Element {
  const { t } = useLocale()
  const tooltips = getPerformanceTooltips(t)
  const netWorthQuery = useQuery<NetWorthData>({
    queryKey: queryKeys.netWorth(),
    queryFn: () => getNetWorth(),
    initialData: initialNetWorth ?? undefined,
    staleTime: 60_000,
  })

  const attributionQuery = useQuery<ReturnAttribution>({
    queryKey: queryKeys.returnAttribution(),
    queryFn: () => getReturnAttribution(),
    staleTime: 60_000,
  })

  const fxQuery = useQuery<FxImpactReport>({
    queryKey: ["fx-impact"],
    queryFn: () => getFxImpact(),
    staleTime: 60_000,
  })

  const netWorth = netWorthQuery.data
  const isLoading =
    (netWorthQuery.isLoading && !netWorth) ||
    (attributionQuery.isLoading && !attributionQuery.data) ||
    (fxQuery.isLoading && !fxQuery.data)

  if (isLoading) {
    return (
      <Card data-testid="performance-now-card">
        <CardContent className="space-y-4 py-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-16 w-full rounded-md" />
        </CardContent>
      </Card>
    )
  }

  if (!netWorth) {
    return (
      <Card className="border-destructive/50" data-testid="performance-now-card">
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground">
            {t("performance.dataUnavailable")}
          </p>
        </CardContent>
      </Card>
    )
  }

  const gainLoss = new Decimal(netWorth.total_gain_loss || "0")
  const startingCapital = new Decimal(attributionQuery.data?.starting_capital || "0")
  const gainPct = startingCapital.isZero()
    ? null
    : gainLoss.div(startingCapital).mul(100)

  const xirr = new Decimal(netWorth.xirr || "0")
  const showXirr = xirr.isFinite() && !xirr.isZero()

  const currentRate = new Decimal(fxQuery.data?.current_rate || "0")
  const showCopBridge =
    hasCopDeposit(netWorth.total_deposited_cop) &&
    currentRate.isFinite() &&
    !currentRate.isZero()
  const worthCopToday = new Decimal(netWorth.net_worth || "0").mul(currentRate)

  return (
    <Card className="h-full" data-testid="performance-now-card">
      <CardContent className="flex flex-col gap-4 py-5">
        <MetricLabel label={t("performance.netWorth")} tooltip={tooltips.netWorth} />

        <div className="flex flex-col gap-3">
          <h2 className="text-3xl font-bold font-mono tracking-tight tabular-nums md:text-4xl text-foreground">
            {formatUSD(new Decimal(netWorth.net_worth || "0"))}
          </h2>
          <p className="text-sm text-muted-foreground font-mono tabular-nums">
            {gainPct === null
              ? formatSignedUSD(gainLoss)
              : `${formatSignedUSD(gainLoss)} · ${formatSignedPct(gainPct)}`}
          </p>
        </div>

        {showXirr && (
          <div className="flex items-center justify-between">
            <MetricLabel label={t("performance.xirr")} tooltip={tooltips.xirr} />
            <span className="text-sm font-mono font-semibold tabular-nums text-foreground">
              {formatSignedPct(xirr)}
            </span>
          </div>
        )}

        {showCopBridge && (
          <div className="rounded-md bg-muted/50 px-3 py-2.5 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <MetricLabel
                className="min-w-0"
                label={t("performance.copDeposited")}
                tooltip={tooltips.copDeposited}
              />
              <span className="shrink-0 font-mono tabular-nums text-foreground">
                {formatCOP(new Decimal(netWorth.total_deposited_cop || "0"))}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <MetricLabel
                className="min-w-0"
                label={t("performance.worthToday")}
                tooltip={t("performance.worthTodayTooltip", {
                  tooltip: tooltips.worthInCopToday,
                  rate: formatRate(currentRate),
                  pair: formatCurrencyPair(MARKET_CONFIG.localCurrency, MARKET_CONFIG.baseCurrency),
                })}
              />
              <span className="shrink-0 font-mono tabular-nums text-foreground">
                {formatCOP(worthCopToday)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
