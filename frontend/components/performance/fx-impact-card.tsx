"use client"

import type React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight } from "lucide-react"
import Decimal from "decimal.js"
import { getFxImpact } from "@/lib/api/analytics"
import type { FxImpactReport } from "@/lib/api/analytics"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"
import { cn } from "@/lib/utils"

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
          <p className="text-sm text-muted-foreground">FX data unavailable.</p>
        </CardContent>
      </Card>
    )
  }

  const avgRate = new Decimal(data.avg_investment_rate || "0")
  const currentRate = new Decimal(data.current_rate || "0")
  const fxImpactUsd = new Decimal(data.fx_impact_usd || "0")
  const rateChangePct = new Decimal(data.rate_change_pct || "0")

  if (avgRate.isZero() && currentRate.isZero()) {
    return (
      <Card>
        <CardContent className="py-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            FX impact
          </h3>
          <p className="text-sm text-muted-foreground">
            No FX data yet. Add a deposit with a COP→USD conversion to see your FX impact.
          </p>
        </CardContent>
      </Card>
    )
  }

  const isPositive = fxImpactUsd.greaterThanOrEqualTo(0)
  const impactLabel = isPositive ? "FX made you" : "FX cost you"
  const colorClass = isPositive ? "text-success" : "text-destructive"

  return (
    <Card>
      <CardContent className="py-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
          FX impact
        </h3>
        <p className={cn("text-2xl font-bold font-mono tabular-nums mb-4", colorClass)}>
          {impactLabel} {formatUSD(fxImpactUsd.abs())}
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Average rate</span>
            <span className="font-mono tabular-nums">
              {formatRate(avgRate)} {MARKET_CONFIG.localCurrency}/USD
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Current rate</span>
            <span className="font-mono tabular-nums">
              {formatRate(currentRate)} {MARKET_CONFIG.localCurrency}/USD
            </span>
          </div>
          {!rateChangePct.isZero() && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Rate change</span>
              <span className={cn("font-mono tabular-nums", rateChangePct.greaterThan(0) ? "text-success" : "text-destructive")}>
                {rateChangePct.greaterThan(0) ? "+" : ""}{rateChangePct.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
        <Link
          href="/cash-flows"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View FX details
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </CardContent>
    </Card>
  )
}