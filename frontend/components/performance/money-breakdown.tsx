"use client"

import type React from "react"
import { useQuery } from "@tanstack/react-query"
import Decimal from "decimal.js"
import { getReturnAttribution } from "@/lib/api/analytics"
import type { ReturnAttribution } from "@/lib/api/analytics"
import { PERFORMANCE_TOOLTIPS } from "@/components/performance/performance-tooltips"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"
import { cn } from "@/lib/utils"

function formatCurrency(value: Decimal): string {
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
      "flex items-center justify-between py-2.5",
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
        {sign}{formatCurrency(variant === "negative" ? amount.abs() : amount)}
      </span>
    </div>
  )
}

export function MoneyBreakdown(): React.JSX.Element {
  const { data, isLoading, error } = useQuery<ReturnAttribution>({
    queryKey: ["return-attribution"],
    queryFn: () => getReturnAttribution(),
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-3 py-6">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-6">
          <p className="text-sm text-destructive">Failed to load breakdown.</p>
        </CardContent>
      </Card>
    )
  }

  const invested = new Decimal(data.starting_capital || "0")
  const marketGains = new Decimal(data.market_gains || "0")
  const fees = new Decimal(data.total_fees_impact || "0")
  const fxImpact = new Decimal(data.fx_impact || "0")
  const currentValue = new Decimal(data.net_position || "0")
  const hasFx = fxImpact.abs().greaterThan(new Decimal("0.01"))

  return (
    <Card>
      <CardContent className="py-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Where did the money go?
        </h3>
        <div className="divide-y divide-border/50">
          <BreakdownRow
            label="What you invested"
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
      </CardContent>
    </Card>
  )
}