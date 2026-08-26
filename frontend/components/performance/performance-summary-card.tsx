"use client"

import type React from "react"
import { useQuery } from "@tanstack/react-query"
import Decimal from "decimal.js"
import { getNetWorth, getReturnAttribution } from "@/lib/api/analytics"
import type { ReturnAttribution } from "@/lib/api/analytics"
import { queryKeys } from "@/lib/api/query-keys"
import type { NetWorthData } from "@/lib/types"
import { PERFORMANCE_TOOLTIPS } from "@/components/performance/performance-tooltips"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface PerformanceSummaryCardProps {
  initialNetWorth: NetWorthData | null
}

function formatUSD(value: Decimal): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: MARKET_CONFIG.baseCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value.toNumber())
}

interface BreakdownRowProps {
  label: string
  tooltip?: string
  amount: Decimal
  variant: "neutral" | "positive" | "negative" | "total"
}

function BreakdownRow({ label, tooltip, amount, variant }: BreakdownRowProps) {
  const amountColor = {
    neutral: "text-foreground",
    positive: "text-success",
    negative: "text-destructive",
    total: "text-foreground",
  }[variant]

  const sign = variant === "positive" && amount.greaterThan(0)
    ? "+"
    : variant === "negative" || amount.lessThan(0)
      ? ""
      : ""

  return (
    <div className={cn(
      "flex items-center justify-between py-2",
      variant === "total" && "border-t border-border pt-3 mt-1",
    )}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(
            "text-sm cursor-default",
            variant === "total" ? "font-bold text-foreground" : "text-muted-foreground",
          )}>
            {label}
          </span>
        </TooltipTrigger>
        {tooltip && (
          <TooltipContent side="top" className="max-w-xs">
            {tooltip}
          </TooltipContent>
        )}
      </Tooltip>
      <span className={cn(
        "text-sm font-mono font-semibold tabular-nums",
        variant === "total" ? "text-base font-bold" : amountColor,
      )}>
        {sign}{formatUSD(variant === "negative" ? amount.abs() : amount)}
      </span>
    </div>
  )
}

export function PerformanceSummaryCard({
  initialNetWorth,
}: PerformanceSummaryCardProps): React.JSX.Element {
  const { data: netWorth, isLoading: netWorthLoading } = useQuery({
    queryKey: queryKeys.netWorth(),
    queryFn: () => getNetWorth(),
    initialData: initialNetWorth ?? undefined,
    staleTime: 60_000,
  })

  const { data: attribution, isLoading: attributionLoading } = useQuery<ReturnAttribution>({
    queryKey: ["return-attribution"],
    queryFn: () => getReturnAttribution(),
    staleTime: 60_000,
  })

  const isLoading = (netWorthLoading && !netWorth) || (attributionLoading && !attribution)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-4 py-6">
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-px w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!netWorth) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-6">
          <p className="text-sm text-destructive">
            Failed to load performance data. Please try refreshing.
          </p>
        </CardContent>
      </Card>
    )
  }

  const gainLoss = new Decimal(netWorth.total_gain_loss || "0")
  const gainLossPct = new Decimal(netWorth.total_gain_loss_pct || "0")
  const isPositive = gainLoss.greaterThanOrEqualTo(0)
  const colorClass = isPositive ? "text-success" : "text-destructive"
  const headlinePrefix = isPositive ? "You're up" : "You're down"
  const TrendIcon = isPositive ? TrendingUp : TrendingDown

  const invested = attribution ? new Decimal(attribution.starting_capital || "0") : new Decimal(0)
  const marketGains = attribution ? new Decimal(attribution.market_gains || "0") : new Decimal(0)
  const fees = attribution ? new Decimal(attribution.total_fees_impact || "0") : new Decimal(0)
  const fxImpact = attribution ? new Decimal(attribution.fx_impact || "0") : new Decimal(0)
  const currentValue = attribution ? new Decimal(attribution.net_position || "0") : new Decimal(0)
  const hasFx = fxImpact.abs().greaterThan(new Decimal("0.01"))

  return (
    <Card>
      <CardContent className="space-y-4 py-6">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Net return
          </p>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 cursor-default">
                <TrendIcon className={cn("size-5", colorClass)} aria-hidden />
                <h2 className={cn("text-3xl font-bold font-mono tracking-tight tabular-nums md:text-4xl", colorClass)}>
                  {headlinePrefix} {formatUSD(gainLoss.abs())}
                </h2>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              {PERFORMANCE_TOOLTIPS.gainLoss}
            </TooltipContent>
          </Tooltip>
          {gainLossPct.isFinite() && !gainLossPct.isZero() && (
            <p className="text-sm text-muted-foreground">
              <span className={cn("font-mono font-semibold tabular-nums", colorClass)}>
                {isPositive ? "+" : ""}{gainLossPct.toFixed(2)}%
              </span>
              {" "}vs previous period
            </p>
          )}
        </div>

        {attribution && (
          <div className="pt-2">
            <div className="divide-y divide-border/50">
              <BreakdownRow
                label="Total invested"
                tooltip={PERFORMANCE_TOOLTIPS.invested}
                amount={invested}
                variant="neutral"
              />
              <BreakdownRow
                label={marketGains.greaterThanOrEqualTo(0) ? "Market gains" : "Market losses"}
                tooltip={PERFORMANCE_TOOLTIPS.marketGains}
                amount={marketGains}
                variant={marketGains.greaterThanOrEqualTo(0) ? "positive" : "negative"}
              />
              <BreakdownRow
                label="Fees paid"
                tooltip={PERFORMANCE_TOOLTIPS.feesPaid}
                amount={fees}
                variant="negative"
              />
              {hasFx && (
                <BreakdownRow
                  label="FX impact"
                  tooltip={PERFORMANCE_TOOLTIPS.fxImpact}
                  amount={fxImpact}
                  variant={fxImpact.greaterThanOrEqualTo(0) ? "positive" : "negative"}
                />
              )}
              <BreakdownRow
                label="What you have now"
                tooltip={PERFORMANCE_TOOLTIPS.currentValue}
                amount={currentValue}
                variant="total"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}