import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { PlanPickerSkeleton } from "./plan-picker-skeleton"

describe("PlanPickerSkeleton", () => {
  it("exposes a status live region labeled Loading on the outer token", () => {
    render(<PlanPickerSkeleton />)
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument()
  })

  it("omits the status role when nested", () => {
    render(<PlanPickerSkeleton nested />)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("renders two plan cards without a Spinner", () => {
    const { container } = render(<PlanPickerSkeleton />)
    expect(screen.getByTestId("plan-picker-skeleton")).toHaveClass("sm:grid-cols-2")
    expect(container.querySelectorAll('[data-slot="card"]')).toHaveLength(2)
    expect(container.querySelector(".animate-spin")).not.toBeInTheDocument()
  })
})
