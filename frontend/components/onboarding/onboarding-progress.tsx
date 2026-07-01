import { cn } from "@/lib/utils"

interface OnboardingProgressProps {
  step: 1 | 2
}

const STEP_LABELS: Record<1 | 2, string> = {
  1: "Tu país",
  2: "Tu broker",
}

export function OnboardingProgress({ step }: OnboardingProgressProps) {
  const percent = (step / 2) * 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">Paso {step} de 2</span>
        <span className="text-muted-foreground">{STEP_LABELS[step]}</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={2}
        aria-label={`Paso ${step} de 2`}
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
