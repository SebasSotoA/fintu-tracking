import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { LandingFeatures } from "./landing-features"

vi.mock("@/lib/fonts/landing-display", () => ({
  landingDisplay: {
    className: "font-landing-display",
    variable: "--font-landing-display",
  },
}))

describe("LandingFeatures", () => {
  it("renders all four feature titles", () => {
    render(<LandingFeatures />)

    expect(screen.getByRole("heading", { name: "Multi-Currency" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Accurate Cost Basis" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Portfolio View" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Performance" })).toBeInTheDocument()
  })
})
