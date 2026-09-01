"use client"

import { useQuery } from "@tanstack/react-query"
import { getActivityFeed, type ActivityItem } from "@/lib/api/activity"
import { queryKeys } from "@/lib/api/query-keys"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { EmptyStateActions, EmptyStateAction } from "@/components/ui/empty-state-actions"
import { AddTradeDialog } from "@/components/trades/add-trade-dialog"
import { AddCashFlowDialog } from "@/components/cash-flows/add-cash-flow-dialog"
import { ActivityFeedItem } from "@/components/dashboard/activity-feed-item"
import { ActivityFeedCardSkeleton } from "@/components/dashboard/dashboard-card-skeleton"
import { useLocale } from "@/components/locale-provider"

export function ActivityFeed() {
  const { t } = useLocale()
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
          <CardTitle className="text-base">{t("dashboard.recentActivity")}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <p className="text-sm text-muted-foreground">{t("dashboard.unableToLoadActivity")}</p>
        </CardContent>
      </Card>
    )
  }

  if (items.length === 0) {
    return (
      <Card className="flex flex-col h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("dashboard.recentActivity")}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <EmptyState
            title={t("dashboard.noActivityYet")}
            description={t("dashboard.noActivityDescription")}
            className="border-0 px-2 py-6 md:px-4 md:py-8"
            action={
              <EmptyStateActions>
                <AddTradeDialog>
                  <EmptyStateAction>{t("trades.add")}</EmptyStateAction>
                </AddTradeDialog>
                <AddCashFlowDialog>
                  <EmptyStateAction>{t("cash.add")}</EmptyStateAction>
                </AddCashFlowDialog>
              </EmptyStateActions>
            }
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("dashboard.recentActivity")}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto px-6 scrollbar-minimal divide-y divide-white/5">
        {items.map((item) => (
          <ActivityFeedItem key={item.id} item={item} />
        ))}
      </CardContent>
    </Card>
  )
}
