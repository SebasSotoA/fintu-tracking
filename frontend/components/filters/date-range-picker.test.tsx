import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DateRangePicker } from "./date-range-picker"
import {
  EMPTY_TRADE_DATE_RANGE,
  applyTradeDatePreset,
  normalizeTradeDateRange,
} from "@/lib/trades/trade-filters"

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

function renderPicker({
  isMobile = false,
  popoverAlign,
}: {
  isMobile?: boolean
  popoverAlign?: "start" | "center" | "end"
} = {}) {
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
        popoverAlign={popoverAlign}
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

  it("uses the shared filter trigger look: outline card, h-9, trailing chevron", () => {
    renderPicker()
    const trigger = screen.getAllByRole("button", { name: /filter cash flows by date/i })[0]
    expect(trigger).toHaveClass("bg-background")
    expect(trigger).toHaveClass("h-9")
    expect(trigger).not.toHaveClass("h-8")
    expect(trigger).not.toHaveClass("h-11")
    expect(trigger.className).toContain("dark:bg-input/30")
    expect(trigger.querySelectorAll("svg").length).toBeGreaterThanOrEqual(2)
  })

  it("renders a popover on desktop", async () => {
    const user = userEvent.setup()
    renderPicker({ isMobile: false })

    await user.click(screen.getAllByRole("button", { name: /filter cash flows by date/i })[0])
    expect(document.querySelector("[data-slot='popover-content']")).toBeInTheDocument()
    expect(document.querySelector("[data-slot='drawer-content']")).not.toBeInTheDocument()
  })

  it("aligns the desktop popover to start by default", async () => {
    const user = userEvent.setup()
    renderPicker({ isMobile: false })

    await user.click(screen.getAllByRole("button", { name: /filter cash flows by date/i })[0])
    expect(document.querySelector("[data-slot='popover-content']")).toHaveAttribute(
      "data-align",
      "start",
    )
  })

  it("aligns the desktop popover to end when popoverAlign is end", async () => {
    const user = userEvent.setup()
    renderPicker({ isMobile: false, popoverAlign: "end" })

    await user.click(screen.getAllByRole("button", { name: /filter cash flows by date/i })[0])
    expect(document.querySelector("[data-slot='popover-content']")).toHaveAttribute(
      "data-align",
      "end",
    )
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

  describe("preset auto-apply", () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] })
      vi.setSystemTime(new Date(2026, 7, 25))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it.each([
      ["last30d" as const, "Last 30d"],
      ["ytd" as const, "YTD"],
      ["12m" as const, "12M"],
    ])("clicking %s auto-applies and closes (desktop)", async (preset, label) => {
      const user = userEvent.setup()
      const { onChange } = renderPicker({ isMobile: false })

      await user.click(screen.getAllByRole("button", { name: /filter cash flows by date/i })[0])
      await user.click(screen.getByRole("button", { name: new RegExp(`^${label}$`, "i") }))

      expect(onChange).toHaveBeenCalledOnce()
      expect(onChange).toHaveBeenCalledWith(
        normalizeTradeDateRange(applyTradeDatePreset(preset, new Date(2026, 7, 25))),
      )
      expect(document.querySelector("[data-slot='popover-content']")).not.toBeInTheDocument()
    })

    it("clicking Last 30d auto-applies and closes (mobile)", async () => {
      const user = userEvent.setup()
      const { onChange } = renderPicker({ isMobile: true })

      await user.click(screen.getAllByRole("button", { name: /filter cash flows by date/i })[0])
      fireEvent.click(screen.getByRole("button", { name: /^last 30d$/i }))

      expect(onChange).toHaveBeenCalledOnce()
      expect(onChange).toHaveBeenCalledWith(
        normalizeTradeDateRange(applyTradeDatePreset("last30d", new Date(2026, 7, 25))),
      )
      expect(document.querySelector("[data-slot='drawer-content']")).toHaveAttribute(
        "data-state",
        "closed",
      )
    })
  })

  it("keeps the Date label visible by default on desktop (trades/cash-flows)", () => {
    renderPicker({ isMobile: false })
    const label = screen.getByText("Date")
    expect(label).not.toHaveClass("sr-only")
    expect(label.parentElement).toHaveClass("space-y-1.5")
  })

  it("keeps the Date label visible by default on mobile (trades/cash-flows)", () => {
    renderPicker({ isMobile: true })
    const label = screen.getByText("Date")
    expect(label).not.toHaveClass("sr-only")
    expect(label.parentElement).toHaveClass("space-y-1.5")
  })

  it("renders the label as sr-only when hideLabel is true on desktop", () => {
    useIsMobileMock.mockReturnValue(false)
    render(
      <DateRangePicker
        id="perf-date-range"
        label="Date range"
        ariaLabel="Filter performance chart by date range"
        value={EMPTY_TRADE_DATE_RANGE}
        onChange={vi.fn()}
        formatLabel={() => "All time"}
        hideLabel
      />,
    )
    const label = screen.getByText("Date range")
    expect(label).toHaveClass("sr-only")
    expect(label.parentElement).not.toHaveClass("space-y-1.5")
    expect(screen.getByRole("button", { name: /filter performance chart by date range/i })).toBeInTheDocument()
  })

  it("renders the label as sr-only when hideLabel is true on mobile", () => {
    useIsMobileMock.mockReturnValue(true)
    render(
      <DateRangePicker
        id="perf-date-range"
        label="Date range"
        ariaLabel="Filter performance chart by date range"
        value={EMPTY_TRADE_DATE_RANGE}
        onChange={vi.fn()}
        formatLabel={() => "All time"}
        hideLabel
      />,
    )
    const label = document.querySelector('label[for="perf-date-range"]')
    expect(label).toHaveTextContent("Date range")
    expect(label).toHaveClass("sr-only")
    expect(label?.parentElement).not.toHaveClass("space-y-1.5")
  })
})
