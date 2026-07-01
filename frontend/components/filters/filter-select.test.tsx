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
    expect(trigger).toHaveClass("h-10")
    expect(trigger).toHaveClass("w-full")
    expect(trigger).toHaveClass("sm:w-[7.5rem]")
  })

  it("allows a custom triggerClassName to override the default", () => {
    render(
      <FilterSelect
        id="status"
        label="Status"
        value="all"
        options={options}
        onChange={() => {}}
        triggerClassName="custom-class"
      />,
    )

    const trigger = screen.getByRole("combobox")
    expect(trigger).toHaveClass("custom-class")
    expect(trigger).not.toHaveClass("w-full")
  })
})
