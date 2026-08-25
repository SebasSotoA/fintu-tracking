import { cn } from "@/lib/utils"

export const SIDEBAR_COLLAPSED_STORAGE_KEY = "fintu-app-sidebar-collapsed"

export const SIDEBAR_WIDTH_EXPANDED = "w-72"
export const SIDEBAR_WIDTH_COLLAPSED = "w-16"

export const SIDEBAR_MAIN_OFFSET_EXPANDED = "md:ml-72"
export const SIDEBAR_MAIN_OFFSET_COLLAPSED = "md:ml-16"

/** Fixed horizontal inset — icons stay aligned when collapsing (llm-control-plane RAIL_PL/PR). */
export const RAIL_PL = "pl-3"
export const RAIL_PR = "pr-3"

export const navIconCellClass =
  "flex h-9 w-9 shrink-0 items-center justify-center [&_svg]:m-auto"

export const navItemTransition = "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]"

export const navIdle = cn(
  navItemTransition,
  "text-sidebar-foreground/70 hover:bg-white/[0.05] hover:text-white",
)

export const navActive = cn(
  navItemTransition,
  "bg-white/[0.08] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)]",
)

export function sidebarLabelClass(collapsed: boolean) {
  return cn(
    "min-w-0 overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-150 ease-in-out",
    collapsed ? "max-w-0 opacity-0 pointer-events-none" : "max-w-[200px] opacity-100",
  )
}
