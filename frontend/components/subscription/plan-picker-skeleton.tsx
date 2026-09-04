import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DEFAULT_SKELETON_LABEL, skeletonRootProps } from "@/components/ui/skeleton-a11y"
import { cn } from "@/lib/utils"

interface PlanPickerSkeletonProps {
  nested?: boolean
  label?: string
  className?: string
}

export function PlanPickerSkeleton({
  nested,
  label = DEFAULT_SKELETON_LABEL,
  className,
}: PlanPickerSkeletonProps) {
  return (
    <div
      className={cn("grid gap-4 sm:grid-cols-2", className)}
      data-testid="plan-picker-skeleton"
      {...skeletonRootProps(nested, label)}
    >
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="space-y-2 pb-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-16" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="mt-4 h-9 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
