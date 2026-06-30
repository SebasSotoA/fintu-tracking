import type { QueryClient } from "@tanstack/react-query"

export const queryKeys = {
  netWorth: () => ["net-worth"] as const,
  feeBreakdown: () => ["fee-breakdown"] as const,
  fxRateChart: (days?: number) =>
    days === undefined ? (["fx-rate-chart"] as const) : (["fx-rate-chart", days] as const),
  returnAttribution: () => ["return-attribution"] as const,
  performanceTimeSeries: (interval: string) => ["performance-time-series", interval] as const,
  feeEfficiency: (groupBy: string) => ["fee-efficiency", groupBy] as const,
  cashReconciliation: () => ["cash-reconciliation"] as const,
  cashFlowsExport: () => ["cash-flows-export"] as const,
  fxCurrentRate: () => ["fx-current-rate"] as const,
  activityFeed: (limit = 8) => ["activity-feed", limit] as const,
  me: () => ["me"] as const,
  brokers: () => ["brokers"] as const,
  plans: () => ["plans"] as const,
  subscription: () => ["subscription"] as const,
}

export async function invalidatePortfolioCaches(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.netWorth() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.returnAttribution() }),
    queryClient.invalidateQueries({ queryKey: queryKeys.feeBreakdown() }),
    queryClient.invalidateQueries({ queryKey: ["performance-time-series"] }),
    queryClient.invalidateQueries({ queryKey: queryKeys.fxRateChart() }),
  ])
}

async function invalidateAfterMutation(queryClient: QueryClient) {
  await Promise.all([
    invalidatePortfolioCaches(queryClient),
    queryClient.invalidateQueries({ queryKey: queryKeys.cashFlowsExport() }),
    queryClient.invalidateQueries({ queryKey: ["activity-feed"] }),
  ])
}

export const invalidateAfterTradeMutation = invalidateAfterMutation
export const invalidateAfterCashFlowMutation = invalidateAfterMutation
