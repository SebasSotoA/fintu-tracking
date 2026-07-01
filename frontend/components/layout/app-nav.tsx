"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  BarChart3,
  CreditCard,
  LogOut,
  User,
  PanelLeftClose,
  PanelRightOpen,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import {
  navActive,
  navIconCellClass,
  navIdle,
  RAIL_PL,
  RAIL_PR,
  sidebarLabelClass,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
} from "@/components/layout/app-sidebar-constants"
import { ProfileConfigDialog } from "@/components/profile/profile-config-dialog"
import type { Profile } from "@/lib/api/me"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trades", label: "Trades", icon: TrendingUp },
  { href: "/cash-flows", label: "Cash Flows", icon: DollarSign },
  { href: "/performance", label: "Performance", icon: BarChart3 },
  { href: "/subscription", label: "Subscription", icon: CreditCard },
]

interface AppNavProps {
  collapsed: boolean
  onToggleCollapsed: () => void
  profile: Profile
}

export function AppNav({ collapsed, onToggleCollapsed, profile }: AppNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const label = sidebarLabelClass(collapsed)
  const [profileOpen, setProfileOpen] = useState(false)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <>
      <aside
        className={cn(
          "hidden md:flex fixed inset-y-0 left-0 z-40 flex-col h-full overflow-hidden",
          "border-r border-sidebar-border bg-background",
          "transition-[width] duration-200 ease-linear",
          collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
        )}
        aria-label="App navigation"
        data-testid="app-sidebar"
        data-collapsed={collapsed ? "true" : "false"}
      >
        <div
          className={cn(
            "flex shrink-0 gap-1 border-b border-border/10 py-4",
            RAIL_PL,
            RAIL_PR,
            collapsed ? "flex-col items-start" : "flex-row items-center",
          )}
        >
          {collapsed ? (
            <button
              type="button"
              onClick={onToggleCollapsed}
              className={cn(
                navIconCellClass,
                "group relative shrink-0 rounded-lg",
                navIdle,
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              )}
              aria-label="Expand sidebar"
              data-testid="app-sidebar-collapse"
            >
              <Image
                src="/fintu-aqua-icon.svg"
                alt=""
                width={28}
                height={28}
                className="size-7 object-contain transition-opacity duration-75 group-hover:opacity-0"
                priority
              />
              <PanelRightOpen
                className="pointer-events-none absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-75 group-hover:opacity-100"
                aria-hidden
              />
            </button>
          ) : (
            <>
              <Link
                href="/dashboard"
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-1 rounded-lg outline-none",
                  "focus-visible:ring-2 focus-visible:ring-primary/40",
                )}
              >
                <span className={cn(navIconCellClass, "shrink-0")} aria-hidden>
                  <Image
                    src="/fintu-aqua-icon.svg"
                    alt=""
                    width={28}
                    height={28}
                    className="size-7 object-contain"
                    priority
                  />
                </span>
                <Image
                  src="/fintu-logo.svg"
                  alt="Fintu"
                  width={80}
                  height={20}
                  className={cn("h-5 w-auto shrink-0", label)}
                  priority
                />
              </Link>
              <button
                type="button"
                onClick={onToggleCollapsed}
                className={cn(
                  navIconCellClass,
                  "shrink-0 rounded-lg",
                  navIdle,
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                )}
                aria-label="Collapse sidebar"
                data-testid="app-sidebar-collapse"
              >
                <PanelLeftClose className="size-4" aria-hidden />
              </button>
            </>
          )}
        </div>

        <div
          className={cn(
            "flex w-full shrink-0 border-b border-border/10 py-3",
            RAIL_PL,
            RAIL_PR,
            collapsed ? "flex-col items-start" : "flex-row items-center",
          )}
        >
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            aria-label={collapsed ? "Mi cuenta" : undefined}
            data-testid="my-account-button"
            className={cn(
              "flex h-9 min-h-9 max-h-9 w-full items-center gap-1 rounded-lg text-left",
              navIdle,
              collapsed ? "justify-start" : "min-w-0 flex-1 gap-3",
            )}
          >
            <span className={navIconCellClass}>
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary-container/30">
                <User className="size-4 text-primary" aria-hidden />
              </div>
            </span>
            <div className={cn("min-w-0 leading-none", label)} aria-hidden={collapsed}>
              <p className="truncate font-sans text-sm font-bold text-primary">Mi cuenta</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Portafolio
              </p>
            </div>
          </button>
        </div>

        <ProfileConfigDialog
          profile={profile}
          open={profileOpen}
          onOpenChange={setProfileOpen}
        />

        <nav
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto py-2 scrollbar-minimal",
            RAIL_PL,
            RAIL_PR,
          )}
          aria-label="Main"
        >
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href || pathname?.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={collapsed ? item.label : undefined}
                className={cn(
                  "flex h-9 min-h-9 w-full items-center gap-1 rounded-lg text-left text-sm font-medium",
                  isActive ? navActive : navIdle,
                )}
              >
                <span className={navIconCellClass}>
                  <Icon className="size-4 shrink-0" aria-hidden />
                </span>
                <span className={label} aria-hidden={collapsed}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        <div
          className={cn(
            "flex w-full shrink-0 border-t border-border/10 py-3",
            RAIL_PL,
            RAIL_PR,
            collapsed ? "flex-col items-start" : "flex-row items-center",
          )}
        >
          <button
            type="button"
            onClick={handleSignOut}
            aria-label={collapsed ? "Sign out" : undefined}
            className={cn(
              "flex h-9 min-h-9 w-full items-center gap-1 rounded-lg text-left text-sm font-medium",
              navIdle,
            )}
          >
            <span className={navIconCellClass}>
              <LogOut className="size-4 shrink-0" aria-hidden />
            </span>
            <span className={label} aria-hidden={collapsed}>
              Sign Out
            </span>
          </button>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 z-50 flex w-full items-center justify-around border-t border-border/20 bg-background/90 px-2 pt-3 pb-6 pb-safe backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setProfileOpen(true)}
          aria-label="Mi cuenta"
          data-testid="my-account-button-mobile"
          className={cn(
            "flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 transition-colors duration-75",
            profileOpen
              ? "bg-primary-container/20 text-primary"
              : "text-foreground/40 hover:text-primary",
          )}
        >
          <User className="size-5" />
          <span className="font-sans text-[10px] font-semibold uppercase tracking-widest">Cuenta</span>
        </button>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href || pathname?.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl px-3 py-1 transition-colors duration-75",
                isActive
                  ? "bg-primary-container/20 text-primary"
                  : "text-foreground/40 hover:text-primary",
              )}
            >
              <Icon className="size-5" />
              <span className="font-sans text-[10px] font-semibold uppercase tracking-widest">
                {item.label}
              </span>
            </Link>
          )
        })}
        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Sign out"
          className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl px-3 py-1 text-foreground/40 transition-colors duration-75 hover:text-primary"
        >
          <LogOut className="size-5" />
          <span className="font-sans text-[10px] font-semibold uppercase tracking-widest">Sign out</span>
        </button>
      </nav>
    </>
  )
}
