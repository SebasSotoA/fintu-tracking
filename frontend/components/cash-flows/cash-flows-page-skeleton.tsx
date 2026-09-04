import { Card, CardContent } from "@/components/ui/card"
import { ChartPanelSkeleton } from "@/components/ui/chart-panel-skeleton"
import { Skeleton } from "@/components/ui/skeleton"
import { TablePageSkeleton } from "@/components/ui/table-page-skeleton"
import { DEFAULT_SKELETON_LABEL, skeletonRootProps } from "@/components/ui/skeleton-a11y"
import { cn } from "@/lib/utils"

interface CashFlowsPageSkeletonProps {
  nested?: boolean
  label?: string
  className?: string
}

export function CashFlowsPageSkeleton({
  nested,
  label = DEFAULT_SKELETON_LABEL,
  className,
}: CashFlowsPageSkeletonProps) {
  return (
    <div className={cn("space-y-8", className)} {...skeletonRootProps(nested, label)}>
      <TablePageSkeleton filterCount={3} nested />
      <ChartPanelSkeleton height="sparkline" withCard nested />
      <Card>
        <CardContent className="py-6 space-y-3">
          <Skeleton className="h-4 w-48" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
