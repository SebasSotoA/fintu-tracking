"use client"

import type React from "react"
import { AlertTriangle, TrendingUp, TrendingDown, Clock, Wallet, Globe } from "lucide-react"
import { usePortfolioHealth, type HealthAlertType } from "@/hooks/use-portfolio-health"

const AlertIcon: Record<Exclude<HealthAlertType, "large_move">, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  concentration: AlertTriangle,
  stale_prices: Clock,
  low_buying_power: Wallet,
  fx_move: Globe,
}

const severityStyles: Record<string, string> = {
  destructive: "border-primary/30 bg-primary/5 text-foreground",
  warning: "border-primary/30 bg-primary/5 text-foreground",
  info: "border-primary/30 bg-primary/5 text-foreground",
}

export function PortfolioHealthBanner() {
  const { alerts } = usePortfolioHealth()

  if (alerts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No notifications</p>
    )
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const IconComp = alert.type === "large_move"
          ? (alert.direction === "down" ? TrendingDown : TrendingUp)
          : AlertIcon[alert.type as Exclude<HealthAlertType, "large_move">]
        // All notification icons use the primary mint palette for visual consistency.
        const iconColor = "text-primary"

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
          </div>
        )
      })}
    </div>
  )
}
