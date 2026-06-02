import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { TradeDateFilter } from "./trade-date-filter"
import { EMPTY_TRADE_DATE_RANGE } from "@/lib/trades/trade-filters"

vi.mock("@/components/ui/calendar", () => ({
  Calendar: ({
    onSelect,
    mode,
  }: {
    onSelect?: (value: Date | { from?: Date; to?: Date }) => void
    mode?: string
  }) => (
    <div data-testid="calendar" data-mode={mode}>
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

describe("TradeDateFilter", () => {
  it("shows All dates on the trigger when empty", () => {
    render(<TradeDateFilter value={EMPTY_TRADE_DATE_RANGE} onChange={() => {}} />)
    expect(screen.getByRole("button", { name: /filter trades by date/i })).toHaveTextContent(
      "All dates",
    )
  })

  it("shows formatted single-day label on the trigger", () => {
    render(
      <TradeDateFilter value={{ from: "2026-03-01", to: null }} onChange={() => {}} />,
    )
    expect(screen.getByRole("button", { name: /filter trades by date/i })).toHaveTextContent(
      "2026",
    )
  })

  it("applies a single-day selection", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<TradeDateFilter value={EMPTY_TRADE_DATE_RANGE} onChange={onChange} />)

    await user.click(screen.getByRole("button", { name: /filter trades by date/i }))
    await user.click(screen.getByRole("button", { name: /pick date/i }))
    await user.click(screen.getByRole("button", { name: /^apply$/i }))

    expect(onChange).toHaveBeenCalledWith({ from: "2026-03-01", to: null })
  })

  it("clears the filter", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <TradeDateFilter value={{ from: "2026-03-01", to: null }} onChange={onChange} />,
    )

    await user.click(screen.getByRole("button", { name: /filter trades by date/i }))
    await user.click(screen.getByRole("button", { name: /^clear$/i }))

    expect(onChange).toHaveBeenCalledWith(EMPTY_TRADE_DATE_RANGE)
  })
})
