import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { AppShellSkeleton } from "./app-shell-skeleton"

describe("AppShellSkeleton", () => {
  it("exposes a status live region labeled Loading on the outer token", () => {
    render(
      <AppShellSkeleton>
        <span>page content</span>
      </AppShellSkeleton>,
    )
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument()
  })

  it("omits the status role when nested", () => {
    render(
      <AppShellSkeleton nested>
        <span>page content</span>
      </AppShellSkeleton>,
    )
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("paints the expanded rail and main offset without a margin transition", () => {
    const { container } = render(
      <AppShellSkeleton>
        <span>page content</span>
      </AppShellSkeleton>,
    )
    const aside = container.querySelector("aside")
    expect(aside).toHaveClass("w-72")
    const mainOffset = container.querySelector(".md\\:ml-72")
    expect(mainOffset).toBeTruthy()
    expect(mainOffset?.className).not.toContain("transition-[margin-left]")
    expect(screen.getByText("page content")).toBeInTheDocument()
  })
})
