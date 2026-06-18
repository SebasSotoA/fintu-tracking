import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LandingNavMobile } from "./landing-nav-mobile"

describe("LandingNavMobile", () => {
  it("exposes anchor links when menu is opened", async () => {
    const user = userEvent.setup()
    render(<LandingNavMobile isAuthenticated={false} />)

    const menu = document.getElementById("landing-mobile-menu")
    expect(menu).toHaveClass("motion-reduce:transition-none")
    expect(menu).toHaveAttribute("aria-hidden", "true")

    await user.click(screen.getByRole("button", { name: "Open menu" }))

    expect(menu).toHaveAttribute("aria-hidden", "false")
    expect(screen.getByRole("link", { name: "Features" })).toHaveAttribute("href", "#features")
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "#about")
  })

  it("shows login and get started when logged out", async () => {
    const user = userEvent.setup()
    render(<LandingNavMobile isAuthenticated={false} />)

    await user.click(screen.getByRole("button", { name: "Open menu" }))

    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute("href", "/auth/login")
    expect(screen.getByRole("link", { name: "Get Started" })).toHaveAttribute(
      "href",
      "/auth/sign-up",
    )
  })

  it("shows dashboard when logged in", async () => {
    const user = userEvent.setup()
    render(<LandingNavMobile isAuthenticated />)

    await user.click(screen.getByRole("button", { name: "Open menu" }))

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard")
    expect(screen.queryByRole("link", { name: "Login" })).not.toBeInTheDocument()
  })
})
