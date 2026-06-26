import { Skeleton } from "@/components/ui/skeleton"
import {
  ActivityFeedCardSkeleton,
  HoldingsTableCardSkeleton,
  NetWorthCardSkeleton,
} from "@/components/dashboard/dashboard-card-skeleton"

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <div className="flex flex-col">
          <NetWorthCardSkeleton />
        </div>
        <div className="flex flex-col">
          <ActivityFeedCardSkeleton />
        </div>
      </div>
      <HoldingsTableCardSkeleton />
    </div>
  )
}
