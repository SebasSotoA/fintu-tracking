import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { FilterSelect } from "./filter-select"

const options = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
]

describe("FilterSelect", () => {
  it("uses the default mobile-first sizing classes when triggerClassName is not provided", () => {
    render(
      <FilterSelect
        id="status"
        label="Status"
        value="all"
        options={options}
        onChange={() => {}}
      />,
    )

    const trigger = screen.getByRole("combobox")
    expect(trigger).toHaveClass("h-9")
    expect(trigger).toHaveClass("w-full")
    expect(trigger).toHaveClass("sm:w-[7.5rem]")
    expect(trigger).toHaveClass("bg-background")
    expect(trigger).toHaveClass("border-border")
    expect(trigger).not.toHaveClass("bg-transparent")
    expect(trigger.className).toContain("dark:bg-input/30")
  })

  it("allows a custom triggerClassName to override the default width without dropping shared styles", () => {
    render(
      <FilterSelect
        id="status"
        label="Status"
        value="all"
        options={options}
        onChange={() => {}}
        triggerClassName="w-full md:w-[7.5rem]"
      />,
    )

    const trigger = screen.getByRole("combobox")
    expect(trigger).toHaveClass("w-full")
    expect(trigger).toHaveClass("md:w-[7.5rem]")
    expect(trigger).not.toHaveClass("sm:w-[7.5rem]")
    expect(trigger).toHaveClass("h-9")
    expect(trigger).toHaveClass("bg-background")
    expect(trigger).toHaveClass("border-border")
    expect(trigger).not.toHaveClass("bg-transparent")
  })
})
