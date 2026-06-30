import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DateRangePicker } from "./date-range-picker"
import { EMPTY_TRADE_DATE_RANGE } from "@/lib/trades/trade-filters"

const useIsMobileMock = vi.fn()

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => useIsMobileMock(),
}))

vi.mock("@/components/ui/calendar", () => ({
  Calendar: ({
    onSelect,
    mode,
    numberOfMonths,
  }: {
    onSelect?: (value: Date | { from?: Date; to?: Date }) => void
    mode?: string
    numberOfMonths?: number
  }) => (
    <div data-testid="calendar" data-mode={mode} data-months={numberOfMonths}>
      <button
        type="button"
        onClick={() => {
          const day = new Date(2026, 2, 1)
          if (mode === "range") {
            onSelect?.({ from: day, to: new Date(2026, 2, 15) })
          } else {
            onSelect?.(day)
          }
        }}
      >
        Pick date
      </button>
    </div>
  ),
}))

function renderPicker({ isMobile = false }: { isMobile?: boolean } = {}) {
  useIsMobileMock.mockReturnValue(isMobile)
  const onChange = vi.fn()
  return {
    onChange,
    ...render(
      <DateRangePicker
        id="cf-filter-date"
        label="Date"
        ariaLabel="Filter cash flows by date"
        value={EMPTY_TRADE_DATE_RANGE}
        onChange={onChange}
        formatLabel={(range) => (range.from ? `${range.from} – ${range.to ?? ""}` : "All dates")}
      />,
    ),
  }
}

describe("DateRangePicker", () => {
  it("shows All dates on the trigger when empty", () => {
    renderPicker()
    expect(screen.getAllByRole("button", { name: /filter cash flows by date/i })[0]).toHaveTextContent(
      "All dates",
    )
  })

  it("renders a popover on desktop", async () => {
    const user = userEvent.setup()
    renderPicker({ isMobile: false })

    await user.click(screen.getAllByRole("button", { name: /filter cash flows by date/i })[0])
    expect(document.querySelector("[data-slot='popover-content']")).toBeInTheDocument()
    expect(document.querySelector("[data-slot='drawer-content']")).not.toBeInTheDocument()
  })

  it("renders a drawer on mobile", async () => {
    const user = userEvent.setup()
    renderPicker({ isMobile: true })

    await user.click(screen.getAllByRole("button", { name: /filter cash flows by date/i })[0])
    expect(document.querySelector("[data-slot='drawer-content']")).toBeInTheDocument()
    expect(document.querySelector("[data-slot='popover-content']")).not.toBeInTheDocument()
  })

  it("applies a single-day selection", async () => {
    const user = userEvent.setup()
    const { onChange } = renderPicker()

    await user.click(screen.getAllByRole("button", { name: /filter cash flows by date/i })[0])
    await user.click(screen.getByRole("button", { name: /pick date/i }))
    await user.click(screen.getByRole("button", { name: /^apply$/i }))

    expect(onChange).toHaveBeenCalledWith({ from: "2026-03-01", to: null })
  })

  it("clears the filter", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <DateRangePicker
        id="cf-filter-date"
        label="Date"
        ariaLabel="Filter cash flows by date"
        value={{ from: "2026-03-01", to: null }}
        onChange={onChange}
        formatLabel={() => "2026-03-01"}
      />,
    )

    await user.click(screen.getAllByRole("button", { name: /filter cash flows by date/i })[0])
    await user.click(screen.getByRole("button", { name: /^clear$/i }))

    expect(onChange).toHaveBeenCalledWith(EMPTY_TRADE_DATE_RANGE)
  })
})
