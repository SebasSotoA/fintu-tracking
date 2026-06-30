import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Subscription } from "@/lib/api/subscription"

interface SubscriptionStatusCardProps {
  subscription: Subscription
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

export function SubscriptionStatusCard({ subscription }: SubscriptionStatusCardProps) {
  const planName = subscription.plan?.name ?? subscription.plan_id

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Current plan</CardTitle>
          <CardDescription>{planName}</CardDescription>
        </div>
        <Badge variant={statusVariant(subscription.status)} className={cn("shrink-0")}>
          {statusLabel(subscription.status)}
        </Badge>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {subscription.status === "canceled" ? (
          <p>Your subscription has been canceled. Renew to regain full access.</p>
        ) : subscription.status === "past_due" ? (
          <p>Your subscription is past due. Update your payment method to restore access.</p>
        ) : (
          <p>Your closed-beta subscription is active. Enjoy unlimited tracking while we prepare paid plans.</p>
        )}
      </CardContent>
    </Card>
  )
}
