"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  BarChart3,
  LogOut,
  User,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import Image from "next/image"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trades", label: "Trades", icon: TrendingUp },
  { href: "/cash-flows", label: "Cash Flows", icon: DollarSign },
  { href: "/performance", label: "Performance", icon: BarChart3 },
]

export function AppNav() {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 flex-col h-full w-72 border-r border-border/20 bg-background z-40">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-border/10">
          <Link href="/dashboard" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <Image
              src="/fintu-logo.svg"
              alt="Fintu"
              width={114}
              height={28}
              className="h-7 w-auto"
              priority
            />
          </Link>
        </div>

        {/* User badge */}
        <div className="px-6 py-5 flex items-center gap-3 border-b border-border/10">
          <div className="w-10 h-10 rounded-xl bg-primary-container/30 flex items-center justify-center shrink-0">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-sans font-bold text-sm text-primary truncate">My Account</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Portfolio</p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href || pathname?.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-lg font-sans font-medium text-sm transition-all duration-200",
                  isActive
                    ? "bg-primary-container/30 text-primary border-r-4 border-primary"
                    : "text-foreground/60 hover:bg-surface-container-low hover:text-foreground/90"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Sign out */}
        <div className="px-4 py-4 border-t border-border/10">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-lg font-sans font-medium text-sm text-foreground/50 hover:bg-surface-container-low hover:text-foreground/80 transition-all duration-200"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-3 bg-background/90 backdrop-blur-xl border-t border-border/20 z-50">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href || pathname?.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all",
                isActive
                  ? "text-primary bg-primary-container/20"
                  : "text-foreground/40 hover:text-primary"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-sans font-semibold uppercase tracking-widest">
                {item.label}
              </span>
            </Link>
          )
        })}
        <button
          onClick={handleSignOut}
          className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-foreground/40 hover:text-primary transition-all"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-[10px] font-sans font-semibold uppercase tracking-widest">Out</span>
        </button>
      </nav>
    </>
  )
}
