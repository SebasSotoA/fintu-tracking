"use client"

import { Bell } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePortfolioHealth } from "@/hooks/use-portfolio-health"
import { NotificationsPopover } from "@/components/dashboard/notifications-popover"
import { cn } from "@/lib/utils"
import { useLocale } from "@/components/locale-provider"

export function NotificationsBell() {
  const { t } = useLocale()
  const { alerts } = usePortfolioHealth()
  const count = alerts.length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={
            count > 0 ? t("dashboard.notificationsUnread", { count }) : t("dashboard.notifications")
          }
          data-testid="notifications-bell"
          className={cn(
            "relative inline-flex size-9 items-center justify-center rounded-lg text-foreground/70",
            "transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-white/[0.06]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          )}
        >
          <Bell className="size-5" aria-hidden />
          {count > 0 && (
            <span
              aria-hidden
              data-testid="notifications-bell-badge"
              className="absolute -top-0.5 -right-0.5 inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground"
            >
              {count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[min(420px,calc(100vw-2rem))] p-0"
      >
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold text-foreground">{t("dashboard.notifications")}</p>
          <p className="text-xs text-muted-foreground">
            {t("dashboard.portfolioHealthAlerts")}
          </p>
        </div>
        <NotificationsPopover alerts={alerts} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}