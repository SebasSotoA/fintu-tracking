"use client"

import { usePathname } from "next/navigation"
import { NotificationsBell } from "@/components/dashboard/notifications-bell"

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/trades": "Trades",
  "/cash-flows": "Cash Flows",
  "/performance": "Performance",
  "/subscription": "Subscription",
}

function deriveTitle(pathname: string | null): string {
  if (!pathname) return "Dashboard"
  if (TITLES[pathname]) return TITLES[pathname]
  const match = Object.entries(TITLES).find(([prefix]) => pathname.startsWith(prefix))
  return match ? match[1] : "Dashboard"
}

export function AppTopbar() {
  const pathname = usePathname()
  const title = deriveTitle(pathname)

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