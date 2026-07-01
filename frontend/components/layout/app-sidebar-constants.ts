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
  "inline-flex h-9 w-9 shrink-0 items-center justify-center"

export const navItemTransition = "transition-colors duration-75"

export const navIdle = cn(
  navItemTransition,
  "text-foreground/60 hover:bg-surface-container-low hover:text-foreground/90",
)

export const navActive = cn(
  navItemTransition,
  "bg-primary-container/30 text-primary",
)

export function sidebarLabelClass(collapsed: boolean) {
  return cn(
    "min-w-0 overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200 ease-in-out",
    collapsed ? "max-w-0 opacity-0 pointer-events-none" : "max-w-[200px] opacity-100",
  )
}
