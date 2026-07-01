import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Subscription } from "@/lib/api/subscription"

interface SubscriptionStatusCardProps {
  subscription: Subscription
  onCancel?: () => void
  isCancelPending?: boolean
}

function statusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Active"
    case "trialing":
      return "Trialing"
    case "past_due":
      return "Past due"
    case "canceled":
      return "Canceled"
    case "incomplete":
      return "Incomplete"
    case "incomplete_expired":
      return "Expired"
    default:
      return status
  }
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
    case "trialing":
      return "default"
    case "past_due":
    case "canceled":
    case "incomplete_expired":
      return "destructive"
    default:
      return "secondary"
  }
}

function statusDescription(subscription: Subscription): string {
  const isClosedBeta = subscription.plan?.tier === "closed_beta"
  const isPaid = !isClosedBeta && subscription.plan?.tier !== "free"

  switch (subscription.status) {
    case "canceled":
      return "Your subscription has been canceled. Renew to regain full access."
    case "past_due":
      return "Your subscription is past due. Update your payment method to restore access."
    case "trialing":
      return isPaid
        ? "Your paid plan is in trial. Subscribe before the trial ends to keep full access."
        : "You are on a trial plan."
    case "incomplete":
      return "Your subscription requires payment confirmation."
    case "incomplete_expired":
      return "Your subscription expired before payment confirmation."
    case "active":
    default:
      return isClosedBeta
        ? "Your closed-beta subscription is active. Enjoy unlimited tracking while we prepare paid plans."
        : isPaid
          ? "Your paid subscription is active."
          : "Your free plan is active."
  }
}

function showCancelButton(subscription: Subscription): boolean {
  if (subscription.plan?.tier === "closed_beta") {
    return false
  }

  return subscription.status === "active" || subscription.status === "trialing"
}

export function SubscriptionStatusCard({
  subscription,
  onCancel,
  isCancelPending = false,
}: SubscriptionStatusCardProps) {
  const planName = subscription.plan?.name ?? subscription.plan_id

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Current plan</CardTitle>
          <CardDescription>{planName}</CardDescription>
        </div>
        <Badge variant={statusVariant(subscription.status)} className="shrink-0">
          {statusLabel(subscription.status)}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>{statusDescription(subscription)}</p>
        {showCancelButton(subscription) && onCancel && (
          <Button
            type="button"
            variant="outline"
            className="w-full md:w-auto"
            disabled={isCancelPending}
            onClick={onCancel}
          >
            {isCancelPending ? "Canceling…" : "Cancel subscription"}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
