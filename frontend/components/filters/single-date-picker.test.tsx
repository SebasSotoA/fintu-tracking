import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SingleDatePicker } from "./single-date-picker"

describe("SingleDatePicker", () => {
  it("applies selected calendar day on Apply", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const today = new Date()
    const currentYear = today.getFullYear()

    render(
      <SingleDatePicker
        id="trade-date"
        label="Date"
        ariaLabel="Trade date"
        value=""
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Trade date" }))
    await user.click(screen.getByRole("button", { name: `Select year ${currentYear}` }))
    await user.click(screen.getByRole("button", { name: "Select year 2024" }))
    await user.click(screen.getByRole("button", { name: "Select June 2024" }))
    await user.click(screen.getByRole("button", { name: /june 15.*2024/i }))
    await user.click(screen.getByRole("button", { name: "Apply" }))

    expect(onChange).toHaveBeenCalledWith("2024-06-15")
  })

  it("navigates year and month drill-down before returning to day view", async () => {
    const user = userEvent.setup()
    const today = new Date()
    const currentYear = today.getFullYear()
    const targetYear = currentYear - 1

    render(
      <SingleDatePicker
        id="trade-date"
        label="Date"
        ariaLabel="Trade date"
        value=""
        onChange={vi.fn()}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Trade date" }))

    expect(screen.getByRole("grid")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: `Select year ${currentYear}` }))

    expect(screen.getByRole("button", { name: `Select year ${targetYear}` })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: `Select year ${targetYear}` }))

    expect(screen.getByRole("button", { name: `Select March ${targetYear}` })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: `Select March ${targetYear}` }))

    expect(screen.getByRole("grid")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: `Select year ${targetYear}` })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^Select month /i })).toBeInTheDocument()
  })

  it("resets to day view when popover reopens", async () => {
    const user = userEvent.setup()
    const today = new Date()
    const currentYear = today.getFullYear()

    render(
      <SingleDatePicker
        id="trade-date"
        label="Date"
        ariaLabel="Trade date"
        value=""
        onChange={vi.fn()}
      />,
    )

    await user.click(screen.getByRole("button", { name: "Trade date" }))
    await user.click(screen.getByRole("button", { name: `Select year ${currentYear}` }))
    expect(screen.queryByRole("grid")).not.toBeInTheDocument()

    await user.keyboard("{Escape}")
    await user.click(screen.getByRole("button", { name: "Trade date" }))

    expect(screen.getByRole("grid")).toBeInTheDocument()
  })
})
