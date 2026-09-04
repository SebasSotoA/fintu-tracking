import { Card, CardContent } from "@/components/ui/card"
import { KpiStripSkeleton } from "@/components/dashboard/kpi-strip-skeleton"
import { ChartPanelSkeleton } from "@/components/ui/chart-panel-skeleton"
import { Skeleton } from "@/components/ui/skeleton"
import { DEFAULT_SKELETON_LABEL, skeletonRootProps } from "@/components/ui/skeleton-a11y"
import { cn } from "@/lib/utils"

interface PerformancePageSkeletonProps {
  nested?: boolean
  label?: string
  className?: string
}

export function PerformancePageSkeleton({
  nested,
  label = DEFAULT_SKELETON_LABEL,
  className,
}: PerformancePageSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)} {...skeletonRootProps(nested, label)}>
      <KpiStripSkeleton columns={4} nested />
      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="h-full">
          <CardContent className="flex flex-col gap-4 py-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-2/3 md:h-10" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
        <ChartPanelSkeleton height="short" withCard nested />
      </div>
      <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 py-6">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 py-6">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
