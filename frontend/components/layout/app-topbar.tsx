"use client"

import { usePathname } from "next/navigation"
import { NotificationsBell } from "@/components/dashboard/notifications-bell"
import { useLocale } from "@/components/locale-provider"
import type { MessageKey } from "@/lib/i18n/types"

const TITLE_KEYS: Record<string, MessageKey> = {
  "/dashboard": "nav.dashboard",
  "/trades": "nav.trades",
  "/cash-flows": "nav.cashFlows",
  "/performance": "nav.performance",
  "/subscription": "nav.subscription",
}

function deriveTitleKey(pathname: string | null): MessageKey {
  if (!pathname) return "nav.dashboard"
  if (TITLE_KEYS[pathname]) return TITLE_KEYS[pathname]
  const match = Object.entries(TITLE_KEYS).find(([prefix]) => pathname.startsWith(prefix))
  return match ? match[1] : "nav.dashboard"
}

export function AppTopbar() {
  const pathname = usePathname()
  const { t } = useLocale()
  const title = t(deriveTitleKey(pathname))

  return (
    <header className="sticky top-0 z-30 hidden md:flex h-16 items-center justify-between gap-4 border-b border-border bg-background px-6">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-lg font-semibold text-foreground truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <NotificationsBell />
      </div>
    </header>
  )
}