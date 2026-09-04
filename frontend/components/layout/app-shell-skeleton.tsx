import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { DEFAULT_SKELETON_LABEL, skeletonRootProps } from "@/components/ui/skeleton-a11y"
import {
  RAIL_PL,
  RAIL_PR,
  SIDEBAR_MAIN_OFFSET_EXPANDED,
  SIDEBAR_WIDTH_EXPANDED,
} from "@/components/layout/app-sidebar-constants"

interface AppShellSkeletonProps {
  children: ReactNode
  nested?: boolean
  label?: string
}

export function AppShellSkeleton({
  children,
  nested,
  label = DEFAULT_SKELETON_LABEL,
}: AppShellSkeletonProps) {
  return (
    <div className="min-h-screen" {...skeletonRootProps(nested, label)}>
      <aside
        className={cn(
          "hidden md:flex fixed inset-y-0 left-0 z-40 flex-col h-full overflow-hidden",
          "border-r border-sidebar-border bg-sidebar",
          "shadow-[2px_0_8px_-2px_rgba(0,0,0,0.4)]",
          SIDEBAR_WIDTH_EXPANDED,
        )}
      >
        <header
          className={cn(
            "h-16 shrink-0 flex items-center justify-between border-b border-border bg-background",
            RAIL_PL,
            RAIL_PR,
          )}
        >
          <div className="flex items-center gap-2">
            <Skeleton className="size-7" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="size-9 rounded-lg" />
        </header>
        <nav className={cn("flex-1 flex flex-col gap-2.5 py-2", RAIL_PL, RAIL_PR)}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 flex items-center gap-2">
              <Skeleton className="size-9 rounded-md" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </nav>
        <footer
          className={cn(
            "mt-auto shrink-0 border-t border-border/10 py-3 flex items-center gap-2",
            RAIL_PL,
            RAIL_PR,
          )}
        >
          <Skeleton className="size-9 rounded-md" />
          <Skeleton className="h-4 w-28" />
        </footer>
      </aside>
      <div className={cn("min-h-screen", SIDEBAR_MAIN_OFFSET_EXPANDED)}>
        <header className="sticky top-0 z-30 hidden md:flex h-16 items-center justify-between gap-4 border-b border-border bg-background px-6">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="size-9 rounded-md" />
        </header>
        <main className="h-[calc(100dvh-4rem)] overflow-y-auto pb-28 md:pb-0">
          <div className="container mx-auto px-4 md:px-8 py-8">{children}</div>
        </main>
      </div>
      <nav className="md:hidden fixed bottom-0 left-0 z-50 flex w-full items-center justify-around border-t border-border/20 bg-background/90 px-2 pt-3 pb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <Skeleton className="size-5" />
            <Skeleton className="h-2 w-10" />
          </div>
        ))}
      </nav>
    </div>
  )
}
