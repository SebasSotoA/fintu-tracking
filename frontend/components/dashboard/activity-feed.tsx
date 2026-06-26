"use client"

import { useQuery } from "@tanstack/react-query"
import { getActivityFeed, type ActivityItem } from "@/lib/api/activity"
import { queryKeys } from "@/lib/api/query-keys"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ActivityFeedItem } from "@/components/dashboard/activity-feed-item"
import { ActivityFeedCardSkeleton } from "@/components/dashboard/dashboard-card-skeleton"

export function ActivityFeed() {
  const { data: items, isLoading, error } = useQuery<ActivityItem[]>({
    queryKey: queryKeys.activityFeed(),
    queryFn: () => getActivityFeed(8),
    staleTime: 60_000,
    refetchInterval: 120_000,
  })

  if (isLoading) {
    return <ActivityFeedCardSkeleton />
  }

  if (error || !items) {
    return (
      <Card className="flex flex-col h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <p className="text-sm text-muted-foreground">Unable to load recent activity.</p>
        </CardContent>
      </Card>
    )
  }

  if (items.length === 0) {
    return (
      <Card className="flex flex-col h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <p className="text-sm text-muted-foreground">
            No activity yet — add your first trade or deposit to get started.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-1 scrollbar-minimal">
        {items.map((item) => (
          <ActivityFeedItem key={item.id} item={item} />
        ))}
      </CardContent>
    </Card>
  )
}
