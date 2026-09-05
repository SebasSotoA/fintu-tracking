import { AuthFloatingCard } from "@/components/auth/auth-floating-card"
import { Skeleton } from "@/components/ui/skeleton"
import { DEFAULT_SKELETON_LABEL, skeletonRootProps } from "@/components/ui/skeleton-a11y"

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
    <AuthFloatingCard
      variant="compact"
      className={className}
      {...skeletonRootProps(nested, label)}
    >
      <div className="flex flex-col items-start gap-1">
        <Skeleton className="h-8 w-24" />
        <div className="space-y-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="mt-6 grid gap-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="grid gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <Skeleton className="h-10 w-full" />
        <Skeleton className="mx-auto h-4 w-40" />
      </div>
    </AuthFloatingCard>
  )
}
