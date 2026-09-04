"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { EmptyStateActions, EmptyStateAction } from "@/components/ui/empty-state-actions"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/components/locale-provider"
import { SubscriptionStatusCard } from "./subscription-status-card"
import { PlanPicker } from "./plan-picker"
import { PlanPickerSkeleton } from "./plan-picker-skeleton"
import { createSubscription, cancelSubscription, billingProvider, type Plan, type Subscription } from "@/lib/api/subscription"
import { queryKeys } from "@/lib/api/query-keys"
import { showToast } from "@/lib/toast"
import { isApiError } from "@/lib/api/errors"

interface SubscriptionPageProps {
  plans: Plan[]
  subscription: Subscription | null
}

export function SubscriptionPage({ plans, subscription }: SubscriptionPageProps) {
  const queryClient = useQueryClient()
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const { t } = useLocale()

  const createMutation = useMutation({
    mutationFn: (plan: Plan) =>
      createSubscription({ plan_id: plan.id, billing_provider: billingProvider }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscription() })
      queryClient.invalidateQueries({ queryKey: queryKeys.me() })
      showToast.success(t("subscription.updated"))
      setSelectedPlan(null)
    },
    onError: (err: unknown) => {
      if (isApiError(err) && err.status === 400) {
        showToast.error(t("subscription.closedBetaPaid"))
        return
      }
      showToast.error(err instanceof Error ? err.message : t("subscription.updateFailed"))
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelSubscription(subscription?.id ?? ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscription() })
      queryClient.invalidateQueries({ queryKey: queryKeys.me() })
      showToast.success(t("subscription.canceledToast"))
    },
    onError: (err: unknown) => {
      showToast.error(err instanceof Error ? err.message : t("subscription.cancelFailed"))
    },
  })

  if (!subscription) {
    return (
      <EmptyState
        title={t("subscription.noSubscriptionTitle")}
        description={t("subscription.noSubscriptionDescription")}
        action={
          <EmptyStateActions>
            <EmptyStateAction>
              <Button variant="outline" onClick={() => window.location.reload()}>
                {t("subscription.retry")}
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
      <h1 className="text-2xl font-bold tracking-tight">{t("subscription.title")}</h1>

      {createMutation.error ? (
        <p className="text-sm text-destructive" data-testid="subscription-error">
          {isApiError(createMutation.error)
            ? createMutation.error.message
            : t("subscription.updateFailed")}
        </p>
      ) : null}

      <SubscriptionStatusCard
        subscription={subscription}
        onCancel={() => cancelMutation.mutate()}
        isCancelPending={cancelMutation.isPending}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("subscription.availablePlans")}</CardTitle>
          <CardDescription>
            {plans.length === 0
              ? t("subscription.noPlansNow")
              : t("subscription.closedBetaSoon")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {createMutation.isPending && selectedPlan ? (
            <PlanPickerSkeleton
              label={t("subscription.updatingTo", { name: selectedPlan.name })}
            />
          ) : (
            <PlanPicker
              plans={plans}
              currentPlanId={subscription.plan_id}
              subscriptionStatus={subscription.status}
              onSelect={handleSelectPlan}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
