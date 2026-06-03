"use client"

import { useEffect, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { AppNav } from "@/components/layout/app-nav"
import {
  SIDEBAR_COLLAPSED_STORAGE_KEY,
  SIDEBAR_MAIN_OFFSET_COLLAPSED,
  SIDEBAR_MAIN_OFFSET_EXPANDED,
} from "@/components/layout/app-sidebar-constants"

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
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
      <AppNav
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
      />
      <main
        className={cn(
          "h-dvh overflow-y-auto scrollbar-minimal pb-28 md:pb-0 transition-[margin-left] duration-200 ease-linear",
          collapsed ? SIDEBAR_MAIN_OFFSET_COLLAPSED : SIDEBAR_MAIN_OFFSET_EXPANDED,
        )}
      >
        <div className="container mx-auto px-4 md:px-8 py-8">{children}</div>
      </main>
    </div>
  )
}
