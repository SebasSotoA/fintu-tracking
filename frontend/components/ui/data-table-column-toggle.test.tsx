import { describe, expect, it, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { DataTableColumnToggle } from "./data-table-column-toggle"
import type { DataTableColumn } from "./data-table"

const columns: DataTableColumn<unknown>[] = [
  { key: "a", header: "A", label: "Alpha", cell: () => "A" },
  { key: "b", header: "B", label: "Beta", cell: () => "B", defaultVisible: false },
  { key: "c", header: "C", label: "Gamma", cell: () => "C", toggleable: false },
]

const defaultVisibleKeys = ["a"]

describe("DataTableColumnToggle", () => {
  it("renders only toggleable columns", () => {
    render(
      <DataTableColumnToggle
        columns={columns}
        visibleKeys={["a"]}
        defaultVisibleKeys={defaultVisibleKeys}
        onChange={vi.fn()}
      />,
    )
    const button = screen.getByRole("button", { name: /View/i })
    fireEvent.click(button)
    expect(screen.getByText("Alpha")).toBeInTheDocument()
    expect(screen.getByText("Beta")).toBeInTheDocument()
    expect(screen.queryByText("Gamma")).not.toBeInTheDocument()
  })

  it("toggles a visible column off", () => {
    const onChange = vi.fn()
    render(
      <DataTableColumnToggle
        columns={columns}
        visibleKeys={["a", "b"]}
        defaultVisibleKeys={defaultVisibleKeys}
        onChange={onChange}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: /View/i }))
    fireEvent.click(screen.getByText("Alpha"))
    expect(onChange).toHaveBeenCalledWith(["b"])
  })

  it("toggles a hidden column on", () => {
    const onChange = vi.fn()
    render(
      <DataTableColumnToggle
        columns={columns}
        visibleKeys={["a"]}
        defaultVisibleKeys={defaultVisibleKeys}
        onChange={onChange}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: /View/i }))
    fireEvent.click(screen.getByText("Beta"))
    expect(onChange).toHaveBeenCalledWith(["a", "b"])
  })

  it("resets to default visible keys", () => {
    const onChange = vi.fn()
    render(
      <DataTableColumnToggle
        columns={columns}
        visibleKeys={["a", "b"]}
        defaultVisibleKeys={defaultVisibleKeys}
        onChange={onChange}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: /View/i }))
    fireEvent.click(screen.getByText("Reset to default"))
    expect(onChange).toHaveBeenCalledWith(defaultVisibleKeys)
  })
})
