"use client"

import { usePathname } from "next/navigation"
import { AccountMenu } from "@/components/profile/account-menu"
import { NotificationsBell } from "@/components/dashboard/notifications-bell"
import type { Profile } from "@/lib/api/me"

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/trades": "Trades",
  "/cash-flows": "Cash Flows",
  "/performance": "Performance",
  "/subscription": "Subscription",
}

interface AppTopbarProps {
  profile: Profile
}

function deriveTitle(pathname: string | null): string {
  if (!pathname) return "Dashboard"
  if (TITLES[pathname]) return TITLES[pathname]
  const match = Object.entries(TITLES).find(([prefix]) => pathname.startsWith(prefix))
  return match ? match[1] : "Dashboard"
}

export function AppTopbar({ profile }: AppTopbarProps) {
  const pathname = usePathname()
  const title = deriveTitle(pathname)

  return (
    <header className="sticky top-0 z-30 hidden md:flex h-16 items-center justify-between gap-4 border-b border-border bg-background/80 px-6 backdrop-blur-xl">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-lg font-semibold text-foreground truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <NotificationsBell />
        <AccountMenu profile={profile} collapsed={false} variant="topbar" />
      </div>
    </header>
  )
}