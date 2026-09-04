import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DEFAULT_SKELETON_LABEL, skeletonRootProps } from "@/components/ui/skeleton-a11y"
import { cn } from "@/lib/utils"

interface AuthCardSkeletonProps {
  nested?: boolean
  label?: string
  className?: string
}

export function AuthCardSkeleton({
  nested,
  label = DEFAULT_SKELETON_LABEL,
  className,
}: AuthCardSkeletonProps) {
  return (
    <Card
      className={cn("w-full border-border/50 bg-card/80 shadow-xl backdrop-blur-sm", className)}
      {...skeletonRootProps(nested, label)}
    >
      <CardHeader className="space-y-3 pb-2 text-center">
        <Skeleton className="h-8 w-24 mx-auto" />
        <div className="space-y-1 flex flex-col items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-11 md:h-9 w-full" />
          </div>
        ))}
        <Skeleton className="h-11 md:h-9 w-full" />
        <Skeleton className="h-4 w-40 mx-auto" />
      </CardContent>
    </Card>
  )
}
