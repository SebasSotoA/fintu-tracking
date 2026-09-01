import { describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import { renderWithLocale } from "@/lib/i18n/test-utils"
import { DatePickerDayHeader, MonthGridPicker } from "./date-picker-views"

describe("MonthGridPicker", () => {
  it("shows English month names when locale is en", () => {
    renderWithLocale(
      <MonthGridPicker year={2026} onSelectMonth={vi.fn()} />,
      { locale: "en" },
    )

    expect(screen.getByRole("button", { name: "Select January 2026" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Select June 2026" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /enero/i })).not.toBeInTheDocument()
  })

  it("shows Spanish month names when locale is es", () => {
    renderWithLocale(
      <MonthGridPicker year={2026} onSelectMonth={vi.fn()} />,
      { locale: "es" },
    )

    expect(screen.getByRole("button", { name: /enero 2026/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /junio 2026/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Select January 2026" })).not.toBeInTheDocument()
  })
})

describe("DatePickerDayHeader", () => {
  it("labels the month in English when locale is en", () => {
    renderWithLocale(
      <DatePickerDayHeader
        displayDate={new Date(2026, 0, 15)}
        onYearClick={vi.fn()}
        onMonthClick={vi.fn()}
      />,
      { locale: "en" },
    )

    expect(screen.getByRole("button", { name: "Select month January" })).toBeInTheDocument()
  })

  it("labels the month in Spanish when locale is es", () => {
    renderWithLocale(
      <DatePickerDayHeader
        displayDate={new Date(2026, 0, 15)}
        onYearClick={vi.fn()}
        onMonthClick={vi.fn()}
      />,
      { locale: "es" },
    )

    expect(screen.getByRole("button", { name: /enero/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Select month January" })).not.toBeInTheDocument()
  })
})
