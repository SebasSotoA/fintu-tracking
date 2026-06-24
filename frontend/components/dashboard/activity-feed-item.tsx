"use client"

import type React from "react"
import Link from "next/link"
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Coins,
} from "lucide-react"
import type { ActivityItem } from "@/lib/api/activity"
import { formatCurrency } from "@/lib/decimal"
import { cn } from "@/lib/utils"

interface IconStyle {
  icon: React.ComponentType<{ className?: string }>
  colorClass: string
  bgClass: string
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours < 24) {
    const hours = Math.floor(diffHours)
    if (hours < 1) return "just now"
    return `${hours}h ago`
  }

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function getIcon(kind: ActivityItem["kind"], direction: ActivityItem["direction"]): IconStyle {
  // All activity icons use the primary mint palette for visual consistency.
  if (kind === "deposit") {
    return { icon: ArrowDownToLine, colorClass: "text-primary", bgClass: "bg-primary/10" }
  }
  if (kind === "withdrawal") {
    return { icon: ArrowUpFromLine, colorClass: "text-primary", bgClass: "bg-primary/10" }
  }
  if (kind === "trade") {
    return direction === "out"
      ? { icon: TrendingDown, colorClass: "text-primary", bgClass: "bg-primary/10" }      // buy
      : { icon: TrendingUp, colorClass: "text-primary", bgClass: "bg-primary/10" }        // sell
  }
  if (kind === "fee") {
    return { icon: Receipt, colorClass: "text-primary", bgClass: "bg-primary/10" }
  }
  if (kind === "cash_adjustment") {
    return { icon: Coins, colorClass: "text-primary", bgClass: "bg-primary/10" }
  }
  return { icon: DollarSign, colorClass: "text-primary", bgClass: "bg-primary/10" }
}

function getKindLabel(kind: ActivityItem["kind"], subKind: string): string {
  if (kind === "trade") return subKind === "buy" ? "Buy" : "Sell"
  if (kind === "deposit") return "Deposit"
  if (kind === "withdrawal") return "Withdrawal"
  if (kind === "fee") return subKind ? `${subKind} fee` : "Fee"
  if (kind === "cash_adjustment") return "Adjustment"
  return kind
}

function getLinkUrl(kind: ActivityItem["kind"]): string {
  return kind === "trade" ? "/trades" : "/cash-flows"
}

interface ActivityFeedItemProps {
  item: ActivityItem
}

export function ActivityFeedItem({ item }: ActivityFeedItemProps) {
  const { icon: Icon, colorClass, bgClass } = getIcon(item.kind, item.direction)
  const label = getKindLabel(item.kind, item.sub_kind)

  return (
    <Link
      href={getLinkUrl(item.kind)}
      className="flex items-center gap-3 rounded-md px-2 py-1.5 -mx-2 hover:bg-muted/50 transition-colors"
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          bgClass,
          colorClass,
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {item.direction === "out" ? "-" : "+"}
          {formatCurrency(item.amount_usd, "USD")} · {label}
          {item.ticker ? ` · ${item.ticker}` : ""}
        </p>
        <p className="text-xs text-muted-foreground truncate">{item.details}</p>
      </div>
      <span className="text-xs text-muted-foreground shrink-0">{formatDate(item.date)}</span>
    </Link>
  )
}
