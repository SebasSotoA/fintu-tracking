import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DEFAULT_SKELETON_LABEL, skeletonRootProps } from "@/components/ui/skeleton-a11y"
import { cn } from "@/lib/utils"

interface KpiStripSkeletonProps {
  columns: 3 | 4
  nested?: boolean
  label?: string
  className?: string
}

export function KpiStripSkeleton({
  columns,
  nested,
  label = DEFAULT_SKELETON_LABEL,
  className,
}: KpiStripSkeletonProps) {
  return (
    <div
      className={cn(
        columns === 3
          ? "grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4"
          : "grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 md:gap-6",
        className,
      )}
      data-testid="kpi-strip-skeleton"
      {...skeletonRootProps(nested, label)}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex flex-col gap-2 py-5">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
