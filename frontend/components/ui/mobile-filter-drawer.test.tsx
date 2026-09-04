import { describe, expect, it } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderWithLocale } from "@/lib/i18n/test-utils"
import { MobileFilterDrawer } from "./mobile-filter-drawer"

describe("MobileFilterDrawer", () => {
  it("renders trigger with label", () => {
    renderWithLocale(
      <MobileFilterDrawer activeCount={0}>
        <div>Filter content</div>
      </MobileFilterDrawer>,
    )
    expect(screen.getByRole("button", { name: "Open filters" })).toBeInTheDocument()
  })

  it("uses custom trigger aria label", () => {
    renderWithLocale(
      <MobileFilterDrawer activeCount={0} triggerAriaLabel="Open trade filters">
        <div />
      </MobileFilterDrawer>,
    )
    expect(screen.getByRole("button", { name: "Open trade filters" })).toBeInTheDocument()
  })

  it("shows active count badge when filters are applied", () => {
    renderWithLocale(
      <MobileFilterDrawer activeCount={2}>
        <div />
      </MobileFilterDrawer>,
    )
    expect(screen.getByText("2")).toBeInTheDocument()
  })

  it("does not show a badge when active count is zero", () => {
    renderWithLocale(
      <MobileFilterDrawer activeCount={0}>
        <div />
      </MobileFilterDrawer>,
    )
    expect(screen.queryByText("0")).not.toBeInTheDocument()
  })

  it("opens and renders children", async () => {
    renderWithLocale(
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
    renderWithLocale(
      <MobileFilterDrawer activeCount={0} closeLabel="Done">
        <div />
      </MobileFilterDrawer>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Open filters" }))
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument()
  })

  it("exposes a test id on the wrapper", () => {
    renderWithLocale(
      <MobileFilterDrawer activeCount={0} testId="mobile-filter-drawer">
        <div />
      </MobileFilterDrawer>,
    )
    expect(screen.getByTestId("mobile-filter-drawer")).toBeInTheDocument()
  })

  it("uses Spanish Filters and Close defaults", async () => {
    renderWithLocale(
      <MobileFilterDrawer activeCount={0}>
        <div />
      </MobileFilterDrawer>,
      { locale: "es" },
    )
    await userEvent.click(screen.getByRole("button", { name: /filtros/i }))
    expect(screen.getByRole("heading", { name: "Filtros" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument()
  })
})
