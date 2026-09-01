"use client"

import type React from "react"
import Link from "next/link"
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Receipt,
  Coins,
  CircleDollarSign,
} from "lucide-react"
import type { ActivityItem } from "@/lib/api/activity"
import { Decimal, formatCurrency, formatAmountPlain } from "@/lib/decimal"
import { formatShortMonthDay, intlLocale } from "@/lib/date-utils"
import { cn } from "@/lib/utils"
import { MARKET_CONFIG } from "@/lib/market-config/market-config"
import { TickerLogo } from "@/components/ui/ticker-logo"
import { useLocale } from "@/components/locale-provider"

function formatDate(dateStr: string, locale: string): string {
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

  return formatShortMonthDay(dateStr, locale)
}

function capitalize(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

interface BadgeStyle {
  label: string
  classes: string
}

function getBadge(kind: ActivityItem["kind"]): BadgeStyle {
  if (kind === "trade") {
    return {
      label: "TRADE",
      classes: "bg-blue-500/15 text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-400/20",
    }
  }
  if (kind === "deposit" || kind === "withdrawal") {
    return {
      label: kind === "deposit" ? "DEPOSIT" : "WITHDRAW",
      classes: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-400/20",
    }
  }
  if (kind === "fee") {
    return {
      label: "FEE",
      classes: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 ring-1 ring-inset ring-indigo-400/20",
    }
  }
  if (kind === "cash_adjustment") {
    return {
      label: "ADJUST",
      classes: "bg-amber-500/15 text-amber-800 dark:text-amber-300 ring-1 ring-inset ring-amber-400/20",
    }
  }
  return { label: "ITEM", classes: "bg-muted text-muted-foreground" }
}

function getTitle(kind: ActivityItem["kind"], subKind: string): string {
  if (kind === "trade") return subKind === "buy" ? "Buy" : "Sell"
  if (kind === "deposit") return "Deposit"
  if (kind === "withdrawal") return "Withdrawal"
  if (kind === "fee") return subKind ? `${capitalize(subKind)} fee` : "Fee"
  if (kind === "cash_adjustment") return "Cash adjustment"
  return capitalize(kind)
}

function getLinkUrl(kind: ActivityItem["kind"]): string {
  return kind === "trade" ? "/trades" : "/cash-flows"
}

/** Parse "sell 0.66509000 IREN @ $60.3300" into a clean display line. */
function formatTradeDetails(raw: string, ticker: string): string {
  const match = raw.match(/([\d.]+)\s+(\S+)\s+@\s+\$?([\d.]+)/)
  if (match) {
    const qty = new Decimal(match[1]).toFixed(4).replace(/\.?0+$/, "")
    const tk = (match[2] || ticker || "").trim()
    const price = new Decimal(match[3]).toFixed(2)
    return `${qty} ${tk} · $${price}`
  }
  return raw
    .replace(/^(buy|sell)\s+/i, "")
    .replace(/(\.\d*?)0+\b/g, "$1")
    .replace(/\.?0+$/g, "")
}

function getDetails(item: ActivityItem): string {
  if (item.kind === "trade") {
    return formatTradeDetails(item.details, item.ticker)
  }
  if (item.kind === "fee") {
    return `$${formatAmountPlain(item.amount_usd, MARKET_CONFIG.baseCurrency)}`
  }
  if (item.kind === "cash_adjustment") {
    return formatCurrency(item.amount_usd, MARKET_CONFIG.baseCurrency)
  }
  if (item.kind === "deposit" || item.kind === "withdrawal") {
    const localCurrency = MARKET_CONFIG.localCurrency
    const copPattern = new RegExp(`${localCurrency}\\s+([\\d.]+)`)
    const copMatch = item.details.match(copPattern)
    if (copMatch) {
      const num = Number(copMatch[1])
      const formatted = new Intl.NumberFormat("en-US").format(num)
      return `${localCurrency} ${formatted}`
    }
    const usdMatch = item.details.match(/\$([\d.]+)/)
    if (usdMatch) {
      return `$${formatAmountPlain(usdMatch[1], MARKET_CONFIG.baseCurrency)}`
    }
    return item.details
  }
  return ""
}

interface RowAvatarProps {
  item: ActivityItem
}

function RowAvatar({ item }: RowAvatarProps) {
  if (item.kind === "trade" && item.ticker) {
    return <TickerLogo ticker={item.ticker} assetType={item.asset_type ?? null} size={32} />
  }

  const Icon =
    item.kind === "deposit"
      ? ArrowDownToLine
      : item.kind === "withdrawal"
        ? ArrowUpFromLine
        : item.kind === "fee"
          ? Receipt
          : item.kind === "cash_adjustment"
            ? Coins
            : CircleDollarSign

  return (
    <div
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground ring-1 ring-border dark:bg-white/[0.06] dark:text-white/85 dark:ring-white/10"
      aria-hidden
    >
      <Icon className="size-4" />
    </div>
  )
}

interface ActivityFeedItemProps {
  item: ActivityItem
}

export function ActivityFeedItem({ item }: ActivityFeedItemProps) {
  const { locale } = useLocale()
  const title = getTitle(item.kind, item.sub_kind)
  const badge = getBadge(item.kind)
  const details = getDetails(item)
  const isPositive = item.direction === "in"
  const amountColor = isPositive ? "text-success" : "text-destructive"
  const sign = isPositive ? "+" : "-"
  const amountText = `${sign}${formatCurrency(item.amount_usd, MARKET_CONFIG.baseCurrency)}`

  return (
    <Link
      href={getLinkUrl(item.kind)}
      className="group flex items-center justify-between gap-3 py-2 transition-colors hover:bg-muted/50 dark:hover:bg-white/[0.02]"
    >
      <div className="flex items-center gap-3 min-w-0">
        <RowAvatar item={item} />
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm font-medium text-foreground shrink-0">{title}</p>
          <span
            className={cn(
              "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0",
              badge.classes,
            )}
          >
            {badge.label}
          </span>
          {details && (
            <span className="text-xs text-muted-foreground truncate">{details}</span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span className={cn("text-sm font-mono font-semibold tabular-nums", amountColor)}>
          {amountText}
        </span>
        <span className="text-[11px] text-muted-foreground">{formatDate(item.date, intlLocale(locale))}</span>
      </div>
    </Link>
  )
}