"use client"

import type React from "react"
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Clock,
  Wallet,
  Globe,
} from "lucide-react"
import type { HealthAlert, HealthAlertType } from "@/hooks/use-portfolio-health"
import { useLocale } from "@/components/locale-provider"

const IconByType: Record<
  Exclude<HealthAlertType, "large_move">,
  React.ComponentType<{ className?: string }>
> = {
  concentration: AlertTriangle,
  stale_prices: Clock,
  low_buying_power: Wallet,
  fx_move: Globe,
}

interface NotificationsPopoverProps {
  alerts: HealthAlert[]
}

export function NotificationsPopover({ alerts }: NotificationsPopoverProps) {
  const { t } = useLocale()
  if (alerts.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
        {t("dashboard.noNotifications")}
      </div>
    )
  }

  return (
    <ul className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto">
      {alerts.map((alert) => {
        const Icon =
          alert.type === "large_move"
            ? alert.direction === "down"
              ? TrendingDown
              : TrendingUp
            : IconByType[alert.type as Exclude<HealthAlertType, "large_move">]

        return (
          <li
            key={alert.type}
            className="flex items-start gap-3 px-4 py-3 text-sm"
            data-testid="notification-item"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground ring-1 ring-border dark:bg-white/[0.06] dark:text-white/80 dark:ring-white/10">
              <Icon className="size-4" aria-hidden />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground leading-snug">{alert.message}</p>
              {alert.details && (
                <p className="mt-1 text-xs text-muted-foreground leading-snug">
                  {alert.details}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}