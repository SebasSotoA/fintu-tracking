import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { LandingFeatures } from "./landing-features"

describe("LandingFeatures", () => {
  it("renders all four feature titles", () => {
    render(<LandingFeatures />)

    expect(screen.getByRole("heading", { name: "Multi-Currency" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Accurate Cost Basis" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Portfolio View" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Performance" })).toBeInTheDocument()
  })
})
