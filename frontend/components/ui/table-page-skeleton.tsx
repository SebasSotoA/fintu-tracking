import { Skeleton } from "@/components/ui/skeleton"
import { DEFAULT_SKELETON_LABEL, skeletonRootProps } from "@/components/ui/skeleton-a11y"
import { cn } from "@/lib/utils"

interface TablePageSkeletonProps {
  filterCount?: number
  nested?: boolean
  label?: string
  className?: string
}

export function TablePageSkeleton({
  filterCount = 4,
  nested,
  label = DEFAULT_SKELETON_LABEL,
  className,
}: TablePageSkeletonProps) {
  return (
    <section
      className={cn("space-y-4", className)}
      data-testid="table-page-skeleton"
      {...skeletonRootProps(nested, label)}
    >
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end md:justify-between">
        <div className="hidden md:flex md:flex-wrap md:items-end md:gap-3">
          {Array.from({ length: filterCount }).map((_, i) => (
            <div
              key={i}
              className="space-y-1.5"
              data-testid="table-page-skeleton-filter"
            >
              <Skeleton className="h-3 w-12" />
              <Skeleton className={filterChipClass(i, filterCount)} />
            </div>
          ))}
        </div>
        <Skeleton className="h-9 w-24 md:hidden" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-9 hidden md:block" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <Skeleton className="h-10 w-full hidden md:block" />
      <div className="hidden md:block space-y-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-14 w-full"
            data-testid="table-page-skeleton-row"
          />
        ))}
      </div>
      <div className="md:hidden space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    </section>
  )
}

function filterChipClass(index: number, filterCount: number): string {
  const isLast = index === filterCount - 1
  if (isLast) return "h-9 w-full md:min-w-[11rem] md:w-40"
  if (filterCount > 3 && index === 2) return "h-9 w-full md:w-[9.5rem]"
  return "h-9 w-full md:w-[7.5rem]"
}
