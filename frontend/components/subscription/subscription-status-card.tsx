"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/components/locale-provider"
import type { Subscription } from "@/lib/api/subscription"
import type { MessageKey } from "@/lib/i18n/types"

interface SubscriptionStatusCardProps {
  subscription: Subscription
  onCancel?: () => void
  isCancelPending?: boolean
}

const STATUS_LABEL_KEYS: Record<string, MessageKey> = {
  active: "subscription.statusActive",
  trialing: "subscription.statusTrialing",
  past_due: "subscription.statusPastDue",
  canceled: "subscription.statusCanceled",
  incomplete: "subscription.statusIncomplete",
  incomplete_expired: "subscription.statusExpired",
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
  const { t } = useLocale()
  const planName = subscription.plan?.name ?? subscription.plan_id
  const statusKey = STATUS_LABEL_KEYS[subscription.status]

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>{t("subscription.currentPlan")}</CardTitle>
          <CardDescription>{planName}</CardDescription>
        </div>
        <Badge variant={statusVariant(subscription.status)} className="shrink-0">
          {statusKey ? t(statusKey) : subscription.status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>{statusDescription(subscription, t)}</p>
        {showCancelButton(subscription) && onCancel && (
          <Button
            type="button"
            variant="outline"
            className="w-full md:w-auto"
            disabled={isCancelPending}
            onClick={onCancel}
          >
            {isCancelPending ? t("subscription.canceling") : t("subscription.cancel")}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function statusDescription(
  subscription: Subscription,
  t: (key: MessageKey) => string,
): string {
  const isClosedBeta = subscription.plan?.tier === "closed_beta"
  const isPaid = !isClosedBeta && subscription.plan?.tier !== "free"

  switch (subscription.status) {
    case "canceled":
      return t("subscription.descCanceled")
    case "past_due":
      return t("subscription.descPastDue")
    case "trialing":
      return isPaid ? t("subscription.descTrialingPaid") : t("subscription.descTrialing")
    case "incomplete":
      return t("subscription.descIncomplete")
    case "incomplete_expired":
      return t("subscription.descIncompleteExpired")
    case "active":
    default:
      return isClosedBeta
        ? t("subscription.descActiveClosedBeta")
        : isPaid
          ? t("subscription.descActivePaid")
          : t("subscription.descActiveFree")
  }
}
