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
  navActive,
  navIconCellClass,
  navIdle,
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
          "transition-[width] duration-200 ease-in-out",
          collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
        )}
        aria-label="App navigation"
        data-testid="app-sidebar"
        data-collapsed={collapsed ? "true" : "false"}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center gap-1 border-b border-border bg-background transition-[padding] duration-200 ease-in-out",
            collapsed ? "flex-col justify-center px-0" : "flex-row justify-between",
            collapsed ? "" : cn(RAIL_PL, RAIL_PR),
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
                style={{ mixBlendMode: "screen" }}
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
                <span className={cn(navIconCellClass, "shrink-0")} aria-hidden style={{mixBlendMode: "screen"}}>
                  <Image
                    src="/fintu-aqua-icon.svg"
                    alt=""
                    width={28}
                    height={28}
                    className="size-7 object-contain"
                    priority
                  />
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
            "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto py-2 scrollbar-minimal transition-[padding] duration-200 ease-in-out",
            collapsed ? "items-center px-0" : cn(RAIL_PL, RAIL_PR),
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
                  "flex h-9 min-h-9 w-full items-center gap-2 rounded-lg text-sm transition-[justify-content,padding,background-color,box-shadow] duration-200 ease-in-out",
                  collapsed ? "justify-center px-0" : "justify-start px-0",
                  isActive ? "font-semibold" : "font-medium",
                  isActive
                    ? collapsed
                      ? "bg-white/[0.08] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)]"
                      : `${navActive}`
                    : navIdle,
                )}
              >
                <span className={navIconCellClass}>
                  <Icon className="size-4 shrink-0" aria-hidden />
                </span>
                <span className={cn("overflow-hidden", label)} aria-hidden={collapsed}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        <div
          className={cn(
            "mt-auto flex w-full shrink-0 border-t border-border/10 py-3 transition-[padding] duration-200 ease-in-out",
            collapsed ? "justify-center px-0" : cn(RAIL_PL, RAIL_PR),
            collapsed ? "flex-col items-center" : "flex-row items-center",
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
      </nav>
    </>
  )
}
