import { CheckIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Plan, Subscription } from "@/lib/api/subscription"

interface PlanPickerProps {
  plans: Plan[]
  currentPlanId: string
  subscriptionStatus?: Subscription["status"]
  onSelect?: (plan: Plan) => void
}

function formatPrice(plan: Plan): string | null {
  if (plan.tier === "closed_beta" || plan.tier === "free") {
    return "Free"
  }
  if (plan.price_monthly_usd) {
    return `$${plan.price_monthly_usd}/mo`
  }
  if (plan.price_annual_usd) {
    return `$${plan.price_annual_usd}/yr`
  }
  return null
}

export function PlanPicker({ plans, currentPlanId, subscriptionStatus, onSelect }: PlanPickerProps) {
  if (plans.length === 0) {
    return <p className="text-sm text-muted-foreground">No plans available.</p>
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {plans.map((plan) => {
        const isCurrent = plan.id === currentPlanId
        const canReactivate = isCurrent && subscriptionStatus === "canceled"
        const price = formatPrice(plan)

        return (
          <Card
            key={plan.id}
            className={cn(
              "relative transition-opacity",
              isCurrent ? "border-primary" : "opacity-80"
            )}
          >
            {isCurrent && (
              <Badge className="absolute top-3 right-3" variant="default">
                <CheckIcon className="mr-1 size-3" /> Current
              </Badge>
            )}
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{plan.name}</CardTitle>
              {price && <CardDescription className="font-medium">{price}</CardDescription>}
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {plan.description && <p className="mb-3">{plan.description}</p>}
              <ul className="space-y-1">
                <li>Tier: {plan.tier}</li>
                {typeof plan.features.max_trades === "number" && (
                  <li>Up to {plan.features.max_trades} trades</li>
                )}
                {typeof plan.features.supports_exports === "boolean" && plan.features.supports_exports && (
                  <li>CSV/PDF exports</li>
                )}
              </ul>
              <div className="mt-4">
                {canReactivate ? (
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={() => onSelect?.(plan)}
                    disabled={!onSelect}
                  >
                    Reactivate
                  </Button>
                ) : isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current plan
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={() => onSelect?.(plan)}
                    disabled={!onSelect}
                  >
                    Choose plan
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
