"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  BarChart3,
  CreditCard,
  PanelLeftClose,
  PanelRightOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  navIconCellClass,
  navIdle,
  navActive,
  navItemTransition,
  RAIL_PL,
  RAIL_PR,
  sidebarLabelClass,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
} from "@/components/layout/app-sidebar-constants"
import { AccountMenu } from "@/components/profile/account-menu"
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
  const label = sidebarLabelClass(collapsed)

  return (
    <>
      <aside
        className={cn(
          "hidden md:flex fixed inset-y-0 left-0 z-40 flex-col h-full overflow-hidden",
          "border-r border-sidebar-border bg-sidebar",
          "shadow-[2px_0_8px_-2px_rgba(0,0,0,0.4)]",
          "transition-[width] duration-150 ease-in-out",
          collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
        )}
        aria-label="App navigation"
        data-testid="app-sidebar"
        data-collapsed={collapsed ? "true" : "false"}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-border bg-background",
            RAIL_PL,
            RAIL_PR,
            "flex-row justify-between",
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
                className="size-7 object-contain transition-opacity duration-75 group-hover:opacity-0 dark:mix-blend-screen"
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
                  "flex min-w-0 flex-1 items-center gap-2 rounded-lg outline-none",
                  "focus-visible:ring-2 focus-visible:ring-primary/40",
                )}
              >
                <span className={cn(navIconCellClass, "shrink-0 dark:mix-blend-screen")} aria-hidden>
                  <Image
                    src="/fintu-aqua-icon.svg"
                    alt=""
                    width={28}
                    height={28}
                    className="size-7 object-contain"
                    priority
                  />
                </span>
                <span className="font-sans text-sm font-bold tracking-tight text-foreground">
                  Fintu
                </span>
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

        <nav
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto py-2 scrollbar-minimal",
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
              <div key={item.href} className="group relative h-9 min-h-9 w-full">
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-0 h-9 w-9 rounded-lg transition-colors duration-200",
                    collapsed && isActive
                      ? "bg-muted dark:bg-white/[0.08] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)]"
                      : collapsed
                        ? "group-hover:bg-muted dark:group-hover:bg-white/[0.05]"
                        : "",
                  )}
                />
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-0 flex h-9 w-9 items-center justify-center [&_svg]:m-auto",
                    isActive
                      ? "text-foreground dark:text-white"
                      : "text-sidebar-foreground dark:text-sidebar-foreground/70",
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                </span>
                <Link
                  href={item.href}
                  aria-label={collapsed ? item.label : undefined}
                  className={cn(
                    "absolute inset-0 flex items-center rounded-lg pl-11 text-sm transition-colors duration-200",
                    isActive ? "font-semibold" : "font-medium",
                    !collapsed && isActive
                      ? navActive
                      : isActive
                        ? cn(navItemTransition, "text-foreground dark:text-white")
                        : navIdle,
                  )}
                >
                  <span className={cn("overflow-hidden", label)} aria-hidden={collapsed}>
                    {item.label}
                  </span>
                </Link>
              </div>
            )
          })}
        </nav>

        <div
          className={cn(
            "mt-auto flex w-full shrink-0 border-t border-border/10 py-3",
            RAIL_PL,
            RAIL_PR,
            collapsed ? "flex-col items-start" : "flex-row items-center",
          )}
        >
          <AccountMenu profile={profile} collapsed={collapsed} variant="sidebar" />
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 z-50 flex w-full items-center justify-around border-t border-border/20 bg-background/90 px-2 pt-3 pb-6 pb-safe backdrop-blur-xl">
        <AccountMenu profile={profile} collapsed={false} variant="mobile" />
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
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                isActive
                  ? "bg-primary-container/20 text-primary"
                  : "text-muted-foreground hover:text-primary",
              )}
            >
              <Icon className="size-5" aria-hidden />
              <span className="font-sans text-[10px] font-semibold uppercase tracking-widest">
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
