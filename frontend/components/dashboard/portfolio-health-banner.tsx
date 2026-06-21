"use client"

import type React from "react"
import { X, AlertTriangle, TrendingUp, TrendingDown, Clock, Wallet, Globe } from "lucide-react"
import { usePortfolioHealth, type HealthAlertType } from "@/hooks/use-portfolio-health"

const AlertIcon: Record<Exclude<HealthAlertType, "large_move">, React.ComponentType<{ className?: string }>> = {
  concentration: AlertTriangle,
  stale_prices: Clock,
  low_buying_power: Wallet,
  fx_move: Globe,
}

const severityStyles: Record<string, string> = {
  destructive: "border-destructive/40 bg-destructive/10 text-destructive-foreground",
  warning: "border-warning/40 bg-warning/10 text-warning-foreground",
  info: "border-primary/30 bg-primary/5 text-foreground",
}

export function PortfolioHealthBanner() {
  const { alerts, dismiss } = usePortfolioHealth()

  if (alerts.length === 0) return null

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const IconComp = alert.type === "large_move"
          ? (alert.direction === "down" ? TrendingDown : TrendingUp)
          : AlertIcon[alert.type as Exclude<HealthAlertType, "large_move">]
        const iconColor = alert.type === "large_move"
          ? (alert.direction === "down" ? "text-destructive" : "text-primary")
          : alert.severity === "destructive"
            ? "text-destructive"
            : alert.severity === "warning"
              ? "text-yellow-600 dark:text-yellow-400"
              : "text-primary"

        return (
          <div
            key={alert.type}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${severityStyles[alert.severity]}`}
          >
            <IconComp className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} />
            <div className="flex-1 min-w-0">
              <p className="font-medium">{alert.message}</p>
              {alert.details && (
                <p className="mt-1 text-xs opacity-70">{alert.details}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(alert.type)}
              className="-mr-1 shrink-0 rounded p-1 opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Dismiss alert"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
