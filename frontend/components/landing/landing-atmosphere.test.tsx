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

  it("uses modest blob opacities for ambient mint atmosphere", () => {
    const { container } = render(
      <LandingAtmosphere>
        <span>Main</span>
      </LandingAtmosphere>,
    )

    const mainGlow = container.querySelector(
      "[data-landing-decoration] .landing-glow",
    )
    const softGlow = container.querySelector(
      "[data-landing-decoration] .landing-glow-reverse",
    )

    expect(mainGlow).toHaveClass("opacity-75")
    expect(softGlow).toHaveClass("opacity-50")
    expect(mainGlow).not.toHaveClass("opacity-80")
    expect(softGlow).not.toHaveClass("opacity-55")
  })

  it("derives atmosphere glows from mint landing tokens tied to primary", () => {
    const { container } = render(
      <LandingAtmosphere>
        <span>Main</span>
      </LandingAtmosphere>,
    )

    const glowElements = Array.from(
      container.querySelectorAll(
        "[data-landing-decoration] .landing-glow, [data-landing-decoration] .landing-glow-reverse",
      ),
    )
    const glowStyles = glowElements.map((element) => element.getAttribute("style") ?? "")

    expect(glowStyles.length).toBeGreaterThanOrEqual(2)
    expect(glowStyles[0]).toContain("var(--landing-glow-mint)")
    expect(glowStyles[1]).toContain("var(--landing-glow-soft)")
    expect(glowStyles.some((style) => style.includes("primary-container"))).toBe(false)
    expect(glowStyles.some((style) => style.includes("color-mix"))).toBe(false)
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
