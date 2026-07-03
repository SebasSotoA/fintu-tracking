import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { LandingFeatures } from "./landing-features"

describe("LandingFeatures", () => {
  it("renders all four feature titles", () => {
    render(<LandingFeatures />)

    expect(screen.getByRole("heading", { name: "Local Currency Deposits" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Broker Fees in Basis" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "US Holdings View" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "True Performance" })).toBeInTheDocument()
  })

  it("emphasizes US holdings, local currency, and broker fees", () => {
    render(<LandingFeatures />)

    expect(screen.getAllByText(/local currency deposits/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/broker fees/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/us stocks, etfs, and crypto/i)).toBeInTheDocument()
  })
})
