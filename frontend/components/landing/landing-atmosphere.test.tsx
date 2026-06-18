import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { LandingAtmosphere } from "./landing-atmosphere"

describe("LandingAtmosphere", () => {
  it("renders children without nested vertical scroll container", () => {
    const { container } = render(
      <LandingAtmosphere>
        <p>Landing content</p>
      </LandingAtmosphere>,
    )

    const root = container.firstElementChild
    expect(root).toBeTruthy()
    expect(root).toHaveClass("min-h-dvh")
    expect(root).not.toHaveClass("overflow-x-hidden")
    expect(screen.getByText("Landing content")).toBeInTheDocument()
  })

  it("keeps decorative layers in a fixed clip container", () => {
    const { container } = render(
      <LandingAtmosphere>
        <span>Main</span>
      </LandingAtmosphere>,
    )

    const decorationLayer = container.querySelector("[data-landing-decoration]")
    expect(decorationLayer).toBeTruthy()
    expect(decorationLayer).toHaveClass("fixed", "inset-0", "overflow-hidden", "pointer-events-none")
  })
})
