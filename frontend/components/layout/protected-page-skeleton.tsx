import { CashFlowsPageSkeleton } from "@/components/cash-flows/cash-flows-page-skeleton"
import { DashboardPageSkeleton } from "@/components/dashboard/dashboard-page-skeleton"
import { PerformancePageSkeleton } from "@/components/performance/performance-page-skeleton"
import { TablePageSkeleton } from "@/components/ui/table-page-skeleton"

export type ProtectedSkeletonKind = "dashboard" | "performance" | "cash-flows" | "table"

interface ProtectedPageSkeletonProps {
  pathname: string | null
  nested?: boolean
}

export function ProtectedPageSkeleton({
  pathname,
  nested,
}: ProtectedPageSkeletonProps) {
  switch (protectedSkeletonKind(pathname)) {
    case "dashboard":
      return <DashboardPageSkeleton nested={nested} />
    case "performance":
      return <PerformancePageSkeleton nested={nested} />
    case "cash-flows":
      return <CashFlowsPageSkeleton nested={nested} />
    default:
      return <TablePageSkeleton nested={nested} />
  }
}

export function protectedSkeletonKind(pathname: string | null): ProtectedSkeletonKind {
  if (pathname?.startsWith("/dashboard")) return "dashboard"
  if (pathname?.startsWith("/performance")) return "performance"
  if (pathname?.startsWith("/cash-flows")) return "cash-flows"
  return "table"
}
