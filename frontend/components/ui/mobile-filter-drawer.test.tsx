import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MobileFilterDrawer } from "./mobile-filter-drawer"

describe("MobileFilterDrawer", () => {
  it("renders trigger with label", () => {
    render(
      <MobileFilterDrawer activeCount={0}>
        <div>Filter content</div>
      </MobileFilterDrawer>,
    )
    expect(screen.getByRole("button", { name: "Open filters" })).toBeInTheDocument()
  })

  it("uses custom trigger aria label", () => {
    render(
      <MobileFilterDrawer activeCount={0} triggerAriaLabel="Open trade filters">
        <div />
      </MobileFilterDrawer>,
    )
    expect(screen.getByRole("button", { name: "Open trade filters" })).toBeInTheDocument()
  })

  it("shows active count badge when filters are applied", () => {
    render(
      <MobileFilterDrawer activeCount={2}>
        <div />
      </MobileFilterDrawer>,
    )
    expect(screen.getByText("2")).toBeInTheDocument()
  })

  it("does not show a badge when active count is zero", () => {
    render(
      <MobileFilterDrawer activeCount={0}>
        <div />
      </MobileFilterDrawer>,
    )
    expect(screen.queryByText("0")).not.toBeInTheDocument()
  })

  it("opens and renders children", async () => {
    render(
      <MobileFilterDrawer activeCount={1} title="Filters" description="Narrow results">
        <div>Filter content</div>
      </MobileFilterDrawer>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Open filters" }))
    expect(screen.getByRole("heading", { name: "Filters" })).toBeInTheDocument()
    expect(screen.getByText("Narrow results")).toBeInTheDocument()
    expect(screen.getByText("Filter content")).toBeInTheDocument()
  })

  it("renders a close button", async () => {
    render(
      <MobileFilterDrawer activeCount={0} closeLabel="Done">
        <div />
      </MobileFilterDrawer>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Open filters" }))
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument()
  })

  it("exposes a test id on the wrapper", () => {
    render(
      <MobileFilterDrawer activeCount={0} testId="mobile-filter-drawer">
        <div />
      </MobileFilterDrawer>,
    )
    expect(screen.getByTestId("mobile-filter-drawer")).toBeInTheDocument()
  })
})
