import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function NetWorthCardSkeleton() {
  return (
    <Card variant="kpi" className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Portfolio total</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-16 w-72" />
        <Skeleton className="h-10 w-64" />
      </CardContent>
    </Card>
  )
}

export function ActivityFeedCardSkeleton() {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}

export function HoldingsTableCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Current Holdings</CardTitle>
        <Skeleton className="h-9 w-36" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}
