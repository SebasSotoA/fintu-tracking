"use client"

import type React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight } from "lucide-react"
import Decimal from "decimal.js"
import { getFxImpact } from "@/lib/api/analytics"
import type { FxImpactReport } from "@/lib/api/analytics"
import { MetricLabel } from "@/components/analytics/metric-primitives"
import { getPerformanceTooltips } from "@/components/performance/performance-tooltips"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { MARKET_CONFIG, formatCurrencyPair } from "@/lib/market-config/market-config"
import { useLocale } from "@/components/locale-provider"

function formatUSD(value: Decimal): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: MARKET_CONFIG.baseCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value.toNumber())
}

function formatRate(value: Decimal): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value.toNumber())
}

export function FxImpactCard(): React.JSX.Element {
  const { t } = useLocale()
  const tooltips = getPerformanceTooltips(t)
  const { data, isLoading, error } = useQuery<FxImpactReport>({
    queryKey: ["fx-impact"],
    queryFn: () => getFxImpact(),
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-3 py-6">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground">{t("performance.fxDataUnavailable")}</p>
        </CardContent>
      </Card>
    )
  }

  const avgRate = new Decimal(data.avg_investment_rate || "0")
  const currentRate = new Decimal(data.current_rate || "0")
  const fxImpactUsd = new Decimal(data.fx_impact_usd || "0")
  const rateChangePct = new Decimal(data.rate_change_pct || "0")
  const usdConverted = new Decimal(data.usd_converted || "0")

  if (avgRate.isZero() && currentRate.isZero()) {
    return (
      <Card>
        <CardContent className="py-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            {t("performance.fxImpact")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("performance.noFxData")}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="py-6">
        <MetricLabel
          label={t("performance.fxImpact")}
          tooltip={tooltips.fxImpact}
          className="mb-1"
        />
        <p className="text-2xl font-bold font-mono tabular-nums text-foreground mb-4">
          {`${fxImpactUsd.greaterThanOrEqualTo(0) ? "+" : "−"}${formatUSD(fxImpactUsd.abs())}`}
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <MetricLabel
              label={t("performance.usdFromCopDeposits")}
              tooltip={tooltips.usdConverted}
            />
            <span className="font-mono tabular-nums">
              {formatUSD(usdConverted)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("performance.averageRate")}</span>
            <span className="font-mono tabular-nums">
              {formatRate(avgRate)} {formatCurrencyPair(MARKET_CONFIG.localCurrency, MARKET_CONFIG.baseCurrency)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("performance.currentRate")}</span>
            <span className="font-mono tabular-nums">
              {formatRate(currentRate)} {formatCurrencyPair(MARKET_CONFIG.localCurrency, MARKET_CONFIG.baseCurrency)}
            </span>
          </div>
          {!rateChangePct.isZero() && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("performance.rateChange")}</span>
              <span className="font-mono tabular-nums text-foreground">
                {rateChangePct.greaterThan(0) ? "+" : ""}{rateChangePct.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
        <Link
          href="/cash-flows"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          {t("performance.viewFxDetails")}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </CardContent>
    </Card>
  )
}