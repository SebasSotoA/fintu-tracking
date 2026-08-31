"use client"

import { useState } from "react"
import { ChevronDown, LogOut, Settings, User } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { ProfileConfigDialog } from "@/components/profile/profile-config-dialog"
import { useSignOut } from "@/hooks/use-sign-out"
import {
  navIconCellClass,
  sidebarLabelClass,
} from "@/components/layout/app-sidebar-constants"
import type { Profile } from "@/lib/api/me"

interface AccountMenuProps {
  profile: Profile
  collapsed: boolean
  variant: "sidebar" | "mobile" | "topbar"
}

export function AccountMenu({ profile, collapsed, variant }: AccountMenuProps) {
  const [profileOpen, setProfileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const signOut = useSignOut()
  const label = sidebarLabelClass(variant === "sidebar" ? collapsed : false)

  const handleConfiguration = () => {
    setMenuOpen(false)
    setProfileOpen(true)
  }

  const handleLogOut = async () => {
    setMenuOpen(false)
    try {
      await signOut()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign out")
    }
  }

  const userIcon = (
    <div className="flex size-8 items-center justify-center rounded-lg bg-muted ring-1 ring-border dark:bg-white/[0.06] dark:ring-white/10">
      <User className="size-4 text-foreground dark:text-white/85" aria-hidden />
    </div>
  )

  const sidebarTrigger = (
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        aria-label={collapsed ? "My account" : undefined}
        data-testid="my-account-button"
        className={cn(
          "flex w-full items-center gap-3 rounded-lg text-left transition-colors duration-200",
          "hover:bg-muted hover:text-foreground dark:hover:bg-white/[0.05] dark:hover:text-white",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          collapsed ? "h-9 min-h-9" : "min-h-11 px-2 py-2",
        )}
      >
        {collapsed ? <span className={navIconCellClass}>{userIcon}</span> : userIcon}
        <div
          className={cn("min-w-0 flex-1 overflow-hidden leading-none", label)}
          aria-hidden={collapsed}
        >
          <p className="truncate font-sans text-sm font-bold text-foreground dark:text-white">My account</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Portfolio
          </p>
        </div>
        {!collapsed ? (
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              menuOpen && "rotate-180",
            )}
            aria-hidden
          />
        ) : null}
      </button>
    </DropdownMenuTrigger>
  )

  const mobileTrigger = (
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        aria-label="My account"
        data-testid="my-account-button-mobile"
          className={cn(
            "flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 transition-colors duration-75",
            menuOpen || profileOpen
              ? "bg-primary-container/30 text-primary"
              : "text-foreground/50 hover:text-primary",
          )}
        >
          <User className="size-5" />
          <span className="font-sans text-[10px] font-semibold uppercase tracking-widest">
            Account
          </span>
        </button>
      </DropdownMenuTrigger>
  )

  const topbarTrigger = (
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        aria-label="My account"
        data-testid="my-account-button-topbar"
        className={cn(
          "flex items-center gap-2 rounded-full p-1 pr-3 transition-colors",
          "hover:bg-muted dark:hover:bg-white/[0.06]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        )}
      >
        <div className="flex size-8 items-center justify-center rounded-full bg-muted ring-1 ring-border dark:bg-white/[0.06] dark:ring-white/10">
          <User className="size-4 text-foreground dark:text-white/85" aria-hidden />
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            menuOpen && "rotate-180",
          )}
          aria-hidden
        />
      </button>
    </DropdownMenuTrigger>
  )

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        {variant === "sidebar" ? sidebarTrigger : variant === "topbar" ? topbarTrigger : mobileTrigger}
        <DropdownMenuContent
          align={variant === "mobile" ? "center" : "end"}
          side={variant === "sidebar" ? "top" : "bottom"}
          sideOffset={variant === "mobile" ? 8 : variant === "topbar" ? 8 : 4}
          className={cn(
            variant === "mobile"
              ? "w-48"
              : variant === "topbar"
                ? "w-56"
                : "w-[--radix-dropdown-menu-trigger-width]",
          )}
        >
          <DropdownMenuItem onSelect={handleConfiguration}>
            <Settings aria-hidden />
            Configuration
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={handleLogOut}>
            <LogOut aria-hidden />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileConfigDialog
        profile={profile}
        open={profileOpen}
        onOpenChange={setProfileOpen}
      />
    </>
  )
}
