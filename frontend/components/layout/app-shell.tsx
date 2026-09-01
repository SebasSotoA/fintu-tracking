"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { AppNav } from "@/components/layout/app-nav"
import { AppTopbar } from "@/components/layout/app-topbar"
import { SetupModal } from "@/components/onboarding/setup-modal"
import { useLocale } from "@/components/locale-provider"
import { useMe } from "@/hooks/use-me"
import { useUpdateProfile } from "@/hooks/use-update-profile"
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
  const { locale, setLocale } = useLocale()
  const { mutate: persistLocale } = useUpdateProfile()
  const persistedLocaleRef = useRef(false)
  const [collapsed, setCollapsed] = useState(false)
  const [sidebarHydrated, setSidebarHydrated] = useState(false)

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true")
    } catch {
      /* ignore storage errors */
    } finally {
      setSidebarHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!sidebarHydrated) return
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, collapsed ? "true" : "false")
    } catch {
      /* ignore quota */
    }
  }, [collapsed, sidebarHydrated])

  useEffect(() => {
    const profileLocale = profile?.locale
    if (profileLocale !== "en" && profileLocale !== "es") return
    setLocale(profileLocale)
  }, [profile?.locale, setLocale])

  useEffect(() => {
    if (!profile || profile.locale != null) return
    if (persistedLocaleRef.current) return
    persistedLocaleRef.current = true
    persistLocale({ locale })
  }, [profile, locale, persistLocale])

  return (
    <div className="min-h-screen">
      {profile && (
        <AppNav
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((c) => !c)}
          profile={profile}
        />
      )}
      <div
        className={cn(
          "min-h-screen transition-[margin-left] duration-150 ease-in-out",
          collapsed ? SIDEBAR_MAIN_OFFSET_COLLAPSED : SIDEBAR_MAIN_OFFSET_EXPANDED,
        )}
      >
        {profile && <AppTopbar />}
        <main className="h-[calc(100dvh-4rem)] overflow-y-auto scrollbar-minimal pb-28 md:pb-0 pb-safe">
          <div className="container mx-auto px-4 md:px-8 py-8">{children}</div>
        </main>
      </div>
      {profile && !profile.onboarding_completed && <SetupModal initialProfile={profile} />}
    </div>
  )
}
