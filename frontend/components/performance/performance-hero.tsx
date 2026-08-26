"use client"

import type React from "react"
import { useQuery } from "@tanstack/react-query"
import Decimal from "decimal.js"
import { getNetWorth } from "@/lib/api/analytics"
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

export interface PerformanceHeroProps {
  initialNetWorth: NetWorthData | null
}

function formatBaseCurrency(value: Decimal): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: MARKET_CONFIG.baseCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value.toNumber())
}

export function PerformanceHero({
  initialNetWorth,
}: PerformanceHeroProps): React.JSX.Element {
  const { data: netWorth, isLoading, error } = useQuery({
    queryKey: queryKeys.netWorth(),
    queryFn: () => getNetWorth(),
    initialData: initialNetWorth ?? undefined,
    staleTime: 60_000,
  })

  if (isLoading && !netWorth) {
    return (
      <Card>
        <CardContent className="space-y-4 py-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </CardContent>
      </Card>
    )
  }

  if (error || !netWorth) {
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
  const totalInvested = new Decimal(netWorth.total_invested || "0")
  const isPositive = gainLoss.greaterThanOrEqualTo(0)
  const colorClass = isPositive ? "text-success" : "text-destructive"

  const headlinePrefix = isPositive ? "You're up" : "You're down"
  const TrendIcon = isPositive ? TrendingUp : TrendingDown

  return (
    <Card>
      <CardContent className="space-y-3 py-6">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 cursor-default">
              <TrendIcon className={cn("size-5", colorClass)} aria-hidden />
              <h2 className={cn("text-3xl font-bold font-mono tracking-tight tabular-nums md:text-4xl", colorClass)}>
                {headlinePrefix} {formatBaseCurrency(gainLoss.abs())} ({gainLossPct.toFixed(2)}%)
              </h2>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            {PERFORMANCE_TOOLTIPS.gainLoss}
          </TooltipContent>
        </Tooltip>
        {totalInvested.greaterThan(0) && (
          <p className="text-sm text-muted-foreground">
            After fees and FX · based on {formatBaseCurrency(totalInvested)} invested
          </p>
        )}
      </CardContent>
    </Card>
  )
}