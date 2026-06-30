import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { LandingHero } from "./landing-hero"

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

  it("does not expose an about section anchor", () => {
    const { container } = render(<LandingHero />)

    expect(container.querySelector("#about")).not.toBeInTheDocument()
  })

  it("renders CTAs with correct auth hrefs", () => {
    render(<LandingHero />)

    const getStarted = screen.getByRole("link", { name: /get started/i })
    const login = screen.getByRole("link", { name: /^login$/i })

    expect(getStarted).toHaveAttribute("href", "/auth/sign-up")
    expect(login).toHaveAttribute("href", "/auth/login")
  })

  it("uses a single-column stats grid on mobile", () => {
    const { container } = render(<LandingHero />)
    const stats = container.querySelector("dl")
    expect(stats).toHaveClass("grid-cols-1", "sm:grid-cols-3")
  })
})
