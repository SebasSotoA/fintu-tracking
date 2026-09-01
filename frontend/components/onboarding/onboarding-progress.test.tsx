import { describe, expect, it } from "vitest"
import { screen } from "@testing-library/react"
import { OnboardingProgress } from "./onboarding-progress"
import { renderWithLocale } from "@/lib/i18n/test-utils"

describe("OnboardingProgress", () => {
  it("shows Step 1 of 2 on step 1", () => {
    renderWithLocale(<OnboardingProgress step={1} />)

    expect(screen.getByText("Step 1 of 2")).toBeInTheDocument()
    expect(screen.getByText("Your country")).toBeInTheDocument()
  })

  it("shows Step 2 of 2 on step 2", () => {
    renderWithLocale(<OnboardingProgress step={2} />)

    expect(screen.getByText("Step 2 of 2")).toBeInTheDocument()
    expect(screen.getByText("Your broker")).toBeInTheDocument()
  })

  it("renders progress bar with correct fill width", () => {
    const { rerender } = renderWithLocale(<OnboardingProgress step={1} />)

    const bar = screen.getByRole("progressbar")
    expect(bar).toHaveAttribute("aria-valuenow", "1")
    expect(bar).toHaveAttribute("aria-valuemax", "2")

    rerender(<OnboardingProgress step={2} />)
    expect(bar).toHaveAttribute("aria-valuenow", "2")
  })
})
