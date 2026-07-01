"use client"

import { useEffect, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { AppNav } from "@/components/layout/app-nav"
import { SetupModal } from "@/components/onboarding/setup-modal"
import { useMe } from "@/hooks/use-me"
import type { Profile } from "@/lib/api/me"
import {
  SIDEBAR_COLLAPSED_STORAGE_KEY,
  SIDEBAR_MAIN_OFFSET_COLLAPSED,
  SIDEBAR_MAIN_OFFSET_EXPANDED,
} from "@/components/layout/app-sidebar-constants"

interface AppShellProps {
  children: ReactNode
  initialProfile?: Profile
}

export function AppShell({ children, initialProfile }: AppShellProps) {
  const { data: profile } = useMe(initialProfile)
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true"
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, collapsed ? "true" : "false")
    } catch {
      /* ignore quota */
    }
  }, [collapsed])

  return (
    <div className="min-h-screen">
      {profile && (
        <AppNav
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((c) => !c)}
          profile={profile}
        />
      )}
      <main
        className={cn(
          "h-dvh overflow-y-auto scrollbar-minimal pb-28 md:pb-0 pb-safe transition-[margin-left] duration-200 ease-linear",
          collapsed ? SIDEBAR_MAIN_OFFSET_COLLAPSED : SIDEBAR_MAIN_OFFSET_EXPANDED,
        )}
      >
        <div className="container mx-auto px-4 md:px-8 py-8">{children}</div>
      </main>
      {profile && !profile.onboarding_completed && <SetupModal initialProfile={profile} />}
    </div>
  )
}
