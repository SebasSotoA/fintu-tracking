"use client"

import Decimal from "decimal.js"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface KpiTileProps {
  label: string
  value: string
  caption?: string
  trendPct?: number | null
  className?: string
}

function formatPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`
}

export function KpiTile({
  label,
  value,
  caption,
  trendPct,
  className,
}: KpiTileProps) {
  const trend = trendPct ?? null
  const trendDir =
    trend === null
      ? null
      : new Decimal(trend).gte(0)
        ? "up"
        : "down"
  const trendColor =
    trendDir === "up"
      ? "text-success"
      : trendDir === "down"
        ? "text-destructive"
        : "text-muted-foreground"

  return (
    <Card className={className}>
      <CardContent className="flex flex-col gap-2 py-5">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
          {label}
        </p>
        <p className="text-2xl font-bold font-mono tabular-nums text-foreground leading-tight">
          {value}
        </p>
        <div className="flex items-center gap-1 text-[11px]">
          {trendDir && (
            <span className={cn("flex items-center gap-0.5", trendColor)}>
              {trendDir === "up" ? (
                <ArrowUpRight className="size-3" aria-hidden />
              ) : (
                <ArrowDownRight className="size-3" aria-hidden />
              )}
              <span className="font-mono tabular-nums">{formatPct(trend ?? 0)}</span>
            </span>
          )}
          {caption && (
            <span className="text-muted-foreground truncate">{caption}</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}