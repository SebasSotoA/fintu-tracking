import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DEFAULT_SKELETON_LABEL, skeletonRootProps } from "@/components/ui/skeleton-a11y"
import { CHART_HEIGHT_MEDIUM, CHART_HEIGHT_SHORT } from "@/lib/chart-sizes"
import { cn } from "@/lib/utils"

type ChartPanelHeight = "short" | "medium" | "sparkline"

interface ChartPanelSkeletonProps {
  height?: ChartPanelHeight
  withCard?: boolean
  showHeader?: boolean
  nested?: boolean
  label?: string
  className?: string
}

export function ChartPanelSkeleton({
  height = "short",
  withCard = true,
  showHeader,
  nested,
  label = DEFAULT_SKELETON_LABEL,
  className,
}: ChartPanelSkeletonProps) {
  const headerVisible = showHeader ?? withCard
  const plot = (
    <Skeleton
      className={cn(heightClass(height), "w-full")}
      data-testid="chart-panel-skeleton-plot"
    />
  )

  if (!withCard) {
    return (
      <div className={className} {...skeletonRootProps(nested, label)}>
        {plot}
      </div>
    )
  }

  if (height === "sparkline") {
    return (
      <div
        className={cn(
          "w-full rounded-2xl border border-border bg-surface-container-high p-6",
          className,
        )}
        {...skeletonRootProps(nested, label)}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-28" />
        </div>
        {plot}
      </div>
    )
  }

  return (
    <Card className={className} {...skeletonRootProps(nested, label)}>
      {headerVisible && (
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-3 w-40" />
          {height === "short" && <Skeleton className="h-8 w-28" />}
        </CardHeader>
      )}
      <CardContent>{plot}</CardContent>
    </Card>
  )
}

function heightClass(height: ChartPanelHeight): string {
  if (height === "medium") return CHART_HEIGHT_MEDIUM
  if (height === "sparkline") return "h-[140px]"
  return CHART_HEIGHT_SHORT
}
