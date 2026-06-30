"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { SubscriptionStatusCard } from "./subscription-status-card"
import { PlanPicker } from "./plan-picker"
import type { Plan, Subscription } from "@/lib/api/subscription"

interface SubscriptionPageProps {
  plans: Plan[]
  subscription: Subscription | null
}

export function SubscriptionPage({ plans, subscription }: SubscriptionPageProps) {
  if (!subscription) {
    return (
      <EmptyState
        title="No subscription found"
        description="We could not find a subscription for your account. Please contact support."
      />
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Subscription</h1>

        <SubscriptionStatusCard subscription={subscription} />

        <Card>
          <CardHeader>
            <CardTitle>Available plans</CardTitle>
            <CardDescription>
              Fintu is currently in closed beta. Paid plans will be available soon.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PlanPicker plans={plans} currentPlanId={subscription.plan_id} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
