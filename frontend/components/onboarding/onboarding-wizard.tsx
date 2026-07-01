"use client"

import type { Profile } from "@/lib/api/me"
import { SetupModal } from "@/components/onboarding/setup-modal"

interface OnboardingWizardProps {
  initialProfile: Profile
}

/** @deprecated Use SetupModal in AppShell instead. Kept for backward compatibility. */
export function OnboardingWizard({ initialProfile }: OnboardingWizardProps) {
  return <SetupModal initialProfile={initialProfile} />
}
