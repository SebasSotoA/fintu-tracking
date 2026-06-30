import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SingleDatePicker } from "./single-date-picker"

const useIsMobileMock = vi.fn()

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => useIsMobileMock(),
}))

function renderPicker({ isMobile = false, value = "" }: { isMobile?: boolean; value?: string } = {}) {
  useIsMobileMock.mockReturnValue(isMobile)
  const onChange = vi.fn()
  return {
    onChange,
    ...render(
      <SingleDatePicker
        id="trade-date"
        label="Date"
        ariaLabel="Trade date"
        value={value}
        onChange={onChange}
      />,
    ),
  }
}

describe("SingleDatePicker", () => {
  it("applies selected calendar day on Apply", async () => {
    const user = userEvent.setup()
    const { onChange } = renderPicker()
    const today = new Date()
    const currentYear = today.getFullYear()

    await user.click(screen.getByRole("button", { name: "Trade date" }))
    await user.click(screen.getByRole("button", { name: `Select year ${currentYear}` }))
    await user.click(screen.getByRole("button", { name: "Select year 2024" }))
    await user.click(screen.getByRole("button", { name: "Select June 2024" }))
    await user.click(screen.getByRole("button", { name: /june 15.*2024/i }))
    await user.click(screen.getByRole("button", { name: "Apply" }))

    expect(onChange).toHaveBeenCalledWith("2024-06-15")
  })

  it("renders a popover on desktop", async () => {
    const user = userEvent.setup()
    renderPicker({ isMobile: false })

    await user.click(screen.getByRole("button", { name: "Trade date" }))
    expect(document.querySelector("[data-slot='popover-content']")).toBeInTheDocument()
    expect(document.querySelector("[data-slot='drawer-content']")).not.toBeInTheDocument()
  })

  it("renders a drawer on mobile", async () => {
    const user = userEvent.setup()
    renderPicker({ isMobile: true })

    await user.click(screen.getByRole("button", { name: "Trade date" }))
    expect(document.querySelector("[data-slot='drawer-content']")).toBeInTheDocument()
    expect(document.querySelector("[data-slot='popover-content']")).not.toBeInTheDocument()
  })

  it("navigates year and month drill-down before returning to day view", async () => {
    const user = userEvent.setup()
    const today = new Date()
    const currentYear = today.getFullYear()
    const targetYear = currentYear - 1

    renderPicker()

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

    renderPicker()

    await user.click(screen.getByRole("button", { name: "Trade date" }))
    await user.click(screen.getByRole("button", { name: `Select year ${currentYear}` }))
    expect(screen.queryByRole("grid")).not.toBeInTheDocument()

    await user.keyboard("{Escape}")
    await user.click(screen.getByRole("button", { name: "Trade date" }))

    expect(screen.getByRole("grid")).toBeInTheDocument()
  })
})
