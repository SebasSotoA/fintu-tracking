import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { OnboardingWizard } from "./onboarding-wizard"
import { SetupModal } from "./setup-modal"
import type { Profile } from "@/lib/api/me"

vi.mock("./setup-modal", () => ({
  SetupModal: vi.fn(() => <div data-testid="setup-modal" />),
}))

const baseProfile: Profile = {
  id: "profile-1",
  user_id: "user-1",
  country: "",
  broker_preset_id: null,
  onboarding_completed: false,
  onboarding_step: "country",
  created_at: "",
  updated_at: "",
}

describe("OnboardingWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("delegates to SetupModal", () => {
    render(<OnboardingWizard initialProfile={baseProfile} />)

    expect(screen.getByTestId("setup-modal")).toBeInTheDocument()
    expect(SetupModal).toHaveBeenCalledWith(
      expect.objectContaining({ initialProfile: baseProfile }),
      undefined,
    )
  })
})
