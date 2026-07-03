import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { LandingFooter } from "./landing-footer"

describe("LandingFooter", () => {
  it("renders logo, navigation links, and copyright", () => {
    const { container } = render(<LandingFooter />)

    expect(screen.getByRole("link", { name: "Fintu" })).toHaveAttribute("href", "/")
    expect(container.querySelector("svg.text-primary")).toBeTruthy()

    expect(screen.getByRole("link", { name: "Features" })).toHaveAttribute("href", "#features")
    expect(screen.queryByRole("link", { name: "About" })).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute("href", "/auth/login")

    expect(
      screen.getByText(`© ${new Date().getFullYear()} Fintu. All rights reserved.`),
    ).toBeInTheDocument()
  })

  it("uses LATAM-local deposit language instead of country-specific currency", () => {
    render(<LandingFooter />)

    expect(screen.getByText(/every local deposit converted/i)).toBeInTheDocument()
    expect(screen.queryByText(/colombian peso/i)).not.toBeInTheDocument()
  })
})
