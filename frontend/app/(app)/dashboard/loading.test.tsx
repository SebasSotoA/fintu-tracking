import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import DashboardLoading from "./loading"

describe("DashboardLoading", () => {
  it("renders DashboardPageSkeleton with the live primary grid", () => {
    render(<DashboardLoading />)
    expect(screen.getByTestId("dashboard-page-skeleton")).toBeInTheDocument()
    expect(screen.getByTestId("dashboard-primary-grid")).toHaveClass(
      "lg:grid-rows-[1fr_auto_1fr]",
    )
  })

  it("does not render a Spinner", () => {
    const { container } = render(<DashboardLoading />)
    expect(container.querySelector(".animate-spin")).not.toBeInTheDocument()
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument()
  })
})
