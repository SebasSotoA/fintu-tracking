"use client"

import { cn } from "@/lib/utils"
import { useLocale } from "@/components/locale-provider"

interface OnboardingProgressProps {
  step: 1 | 2
}

export function OnboardingProgress({ step }: OnboardingProgressProps) {
  const { t } = useLocale()
  const percent = (step / 2) * 100
  const stepLabel = t("onboarding.stepOf", { step })
  const stageLabel = step === 1 ? t("onboarding.yourCountry") : t("onboarding.yourBroker")

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{stepLabel}</span>
        <span className="text-muted-foreground">{stageLabel}</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={2}
        aria-label={stepLabel}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn("h-full rounded-full bg-primary transition-all duration-300")}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
