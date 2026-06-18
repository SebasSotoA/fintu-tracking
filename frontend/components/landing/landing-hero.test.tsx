import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { LandingHero } from "./landing-hero"

vi.mock("@/lib/fonts/landing-display", () => ({
  landingDisplay: {
    className: "font-landing-display",
    variable: "--font-landing-display",
  },
}))

describe("LandingHero", () => {
  it("renders headline and subcopy", () => {
    render(<LandingHero />)

    expect(
      screen.getByRole("heading", { level: 1, name: /track your usd investments/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/with precision/i)).toBeInTheDocument()
    expect(
      screen.getByText(/fintu accounts for cop↔usd fx, fees, and cost basis/i),
    ).toBeInTheDocument()
  })

  it("renders CTAs with correct auth hrefs", () => {
    render(<LandingHero />)

    const getStarted = screen.getByRole("link", { name: /get started/i })
    const login = screen.getByRole("link", { name: /^login$/i })

    expect(getStarted).toHaveAttribute("href", "/auth/sign-up")
    expect(login).toHaveAttribute("href", "/auth/login")
  })
})
