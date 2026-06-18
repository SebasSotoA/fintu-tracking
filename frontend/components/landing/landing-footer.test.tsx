import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { LandingFooter } from "./landing-footer"

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}))

vi.mock("@/lib/fonts/landing-display", () => ({
  landingDisplay: {
    className: "font-landing-display",
    variable: "--font-landing-display",
  },
}))

describe("LandingFooter", () => {
  it("renders logo, navigation links, and copyright", () => {
    render(<LandingFooter />)

    expect(screen.getByRole("img", { name: "Fintu" })).toHaveAttribute("src", "/fintu-logo.svg")

    expect(screen.getByRole("link", { name: "Features" })).toHaveAttribute("href", "#features")
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "#about")
    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute("href", "/auth/login")

    expect(
      screen.getByText(`© ${new Date().getFullYear()} Fintu. All rights reserved.`),
    ).toBeInTheDocument()
  })
})
