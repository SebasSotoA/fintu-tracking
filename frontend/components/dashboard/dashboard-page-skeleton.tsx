import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { KpiStripSkeleton } from "@/components/dashboard/kpi-strip-skeleton"
import { Skeleton } from "@/components/ui/skeleton"
import { DEFAULT_SKELETON_LABEL, skeletonRootProps } from "@/components/ui/skeleton-a11y"
import { cn } from "@/lib/utils"

interface DashboardSkeletonTokenProps {
  nested?: boolean
  label?: string
  className?: string
}

export function DashboardPageSkeleton({
  nested,
  label = DEFAULT_SKELETON_LABEL,
  className,
}: DashboardSkeletonTokenProps) {
  return (
    <div
      className={cn("space-y-6", className)}
      data-testid="dashboard-page-skeleton"
      {...skeletonRootProps(nested, label)}
    >
      <div
        className="grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-[1fr_auto_1fr] gap-4 md:gap-6"
        data-testid="dashboard-primary-grid"
      >
        <div className="lg:row-start-1 lg:row-end-2 lg:col-start-1 lg:col-end-2">
          <NetWorthCardSkeleton nested />
        </div>
        <div className="lg:row-start-1 lg:row-end-2 lg:col-start-2 lg:col-end-3">
          <TopHoldingsCardSkeleton nested />
        </div>
        <div className="lg:row-start-2 lg:row-end-3 lg:col-start-1 lg:col-end-2">
          <KpiStripSkeleton columns={3} nested />
        </div>
        <div className="lg:row-start-3 lg:row-end-4 lg:col-start-1 lg:col-end-2">
          <AssetAllocationCardSkeleton nested />
        </div>
        <div className="lg:row-start-2 lg:row-end-4 lg:col-start-2 lg:col-end-3">
          <ActivityFeedCardSkeleton nested />
        </div>
      </div>
      <HoldingsSectionSkeleton nested />
    </div>
  )
}

export function NetWorthCardSkeleton({
  nested,
  label = DEFAULT_SKELETON_LABEL,
  className,
}: DashboardSkeletonTokenProps) {
  return (
    <Card className={cn("h-full", className)} {...skeletonRootProps(nested, label)}>
      <CardContent className="flex flex-col gap-4 py-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Skeleton className="h-3 w-28" />
          <div className="flex w-fit items-center rounded-md">
            <Skeleton className="h-8 w-8" data-testid="net-worth-period-bar" />
            <Skeleton className="h-8 w-8" data-testid="net-worth-period-bar" />
            <Skeleton className="h-8 w-10" data-testid="net-worth-period-bar" />
            <Skeleton className="h-8 w-8" data-testid="net-worth-period-bar" />
            <Skeleton className="h-8 w-10" data-testid="net-worth-period-bar" />
          </div>
        </div>
        <Skeleton className="h-9 w-48 md:h-10 md:w-56" />
        <Skeleton className="h-4 w-16" />
        <Skeleton
          className="min-h-[128px] w-full flex-1"
          data-testid="net-worth-chart-skeleton"
        />
        <Skeleton className="h-2.5 w-40" />
      </CardContent>
    </Card>
  )
}

export function TopHoldingsCardSkeleton({
  nested,
  label = DEFAULT_SKELETON_LABEL,
  className,
}: DashboardSkeletonTokenProps) {
  return (
    <Card className={cn("h-full", className)} {...skeletonRootProps(nested, label)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-12" />
        </div>
      </CardHeader>
      <CardContent className="px-2 py-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2.5 py-2 px-3">
            <Skeleton className="size-7 rounded-md" />
            <div className="min-w-0 flex-1 space-y-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-2.5 w-8" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function AssetAllocationCardSkeleton({
  nested,
  label = DEFAULT_SKELETON_LABEL,
  className,
}: DashboardSkeletonTokenProps) {
  return (
    <Card className={cn("h-full", className)} {...skeletonRootProps(nested, label)}>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <Skeleton className="size-40 sm:size-44 rounded-full shrink-0" />
          <ul className="flex flex-col gap-2 flex-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex items-center gap-2">
                <Skeleton className="size-2.5 rounded-full" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-8 ml-auto" />
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

export function ActivityFeedCardSkeleton({
  nested,
  label = DEFAULT_SKELETON_LABEL,
  className,
}: DashboardSkeletonTokenProps) {
  return (
    <Card
      className={cn("flex flex-col h-full", className)}
      {...skeletonRootProps(nested, label)}
    >
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="flex-1 space-y-0 px-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 py-2"
            data-testid="activity-feed-skeleton-row"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-10 rounded-md" />
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function HoldingsSectionSkeleton({
  nested,
  label = DEFAULT_SKELETON_LABEL,
  className,
}: DashboardSkeletonTokenProps) {
  return (
    <section className={cn("space-y-4", className)} {...skeletonRootProps(nested, label)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Skeleton className="h-4 w-36" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-9 hidden md:block" />
        </div>
      </div>
      <Skeleton className="h-10 w-full hidden md:block" />
      <div className="hidden md:block space-y-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-14 w-full"
            data-testid="holdings-section-skeleton-row"
          />
        ))}
      </div>
      <div className="md:hidden space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    </section>
  )
}
