"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { EmptyStateActions, EmptyStateAction } from "@/components/ui/empty-state-actions"
import { Button } from "@/components/ui/button"
import { SubscriptionStatusCard } from "./subscription-status-card"
import { PlanPicker } from "./plan-picker"
import { createSubscription, cancelSubscription, billingProvider, type Plan, type Subscription } from "@/lib/api/subscription"
import { queryKeys } from "@/lib/api/query-keys"
import { showToast } from "@/lib/toast"
import { ApiError } from "@/lib/api/client"

interface SubscriptionPageProps {
  plans: Plan[]
  subscription: Subscription | null
}

function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError
}

export function SubscriptionPage({ plans, subscription }: SubscriptionPageProps) {
  const queryClient = useQueryClient()
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)

  const createMutation = useMutation({
    mutationFn: (plan: Plan) =>
      createSubscription({ plan_id: plan.id, billing_provider: billingProvider }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscription() })
      queryClient.invalidateQueries({ queryKey: queryKeys.me() })
      showToast.success("Subscription updated")
      setSelectedPlan(null)
    },
    onError: (err: unknown) => {
      if (isApiError(err) && err.status === 400) {
        showToast.error("Paid plans are not available during the closed beta.")
        return
      }
      showToast.error(err instanceof Error ? err.message : "Failed to update subscription")
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelSubscription(subscription?.id ?? ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscription() })
      queryClient.invalidateQueries({ queryKey: queryKeys.me() })
      showToast.success("Subscription canceled")
    },
    onError: (err: unknown) => {
      showToast.error(err instanceof Error ? err.message : "Failed to cancel subscription")
    },
  })

  if (!subscription) {
    return (
      <EmptyState
        title="No subscription found"
        description="We could not find a subscription for your account. Please contact support."
        action={
          <EmptyStateActions>
            <EmptyStateAction>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </EmptyStateAction>
          </EmptyStateActions>
        }
      />
    )
  }

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan)
    createMutation.mutate(plan)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Subscription</h1>

      {createMutation.error ? (
        <p className="text-sm text-destructive" data-testid="subscription-error">
          {isApiError(createMutation.error)
            ? createMutation.error.message
            : "Failed to update subscription"}
        </p>
      ) : null}

      <SubscriptionStatusCard
        subscription={subscription}
        onCancel={() => cancelMutation.mutate()}
        isCancelPending={cancelMutation.isPending}
      />

      <Card>
        <CardHeader>
          <CardTitle>Available plans</CardTitle>
          <CardDescription>
            {plans.length === 0
              ? "No plans are available right now."
              : "Fintu is currently in closed beta. Paid plans will be available soon."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {createMutation.isPending && selectedPlan ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Updating to {selectedPlan.name}…
            </div>
          ) : (
            <PlanPicker
              plans={plans}
              currentPlanId={subscription.plan_id}
              onSelect={handleSelectPlan}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
