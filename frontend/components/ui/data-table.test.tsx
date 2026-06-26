import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { DataTable, type DataTableColumn } from "./data-table"

interface Row {
  id: string
  name: string
  amount: number
}

const columns: DataTableColumn<Row>[] = [
  { key: "name", header: "Name", cell: (row) => row.name },
  { key: "amount", header: "Amount", cell: (row) => row.amount, align: "right", className: "font-mono" },
]

const rows: Row[] = [
  { id: "1", name: "A", amount: 100 },
  { id: "2", name: "B", amount: 200 },
]

describe("DataTable", () => {
  it("renders header cells", () => {
    render(<DataTable data={rows} columns={columns} keyExtractor={(row) => row.id} />)
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Amount" })).toBeInTheDocument()
  })

  it("renders body rows", () => {
    render(<DataTable data={rows} columns={columns} keyExtractor={(row) => row.id} />)
    const cells = screen.getAllByRole("cell")
    expect(cells[0]).toHaveTextContent("A")
    expect(cells[1]).toHaveTextContent("100")
    expect(cells[2]).toHaveTextContent("B")
    expect(cells[3]).toHaveTextContent("200")
  })

  it("renders empty state when data is empty", () => {
    render(<DataTable data={[]} columns={columns} emptyState={<p>No data</p>} />)
    expect(screen.getByText("No data")).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("applies right alignment and custom classes to columns", () => {
    render(<DataTable data={rows} columns={columns} keyExtractor={(row) => row.id} />)
    const amountHeader = screen.getByRole("columnheader", { name: "Amount" })
    expect(amountHeader).toHaveClass("text-right")
    const amountCells = screen.getAllByRole("cell").filter((cell) => cell.textContent?.match(/^\d+$/))
    expect(amountCells[0]).toHaveClass("font-mono")
  })

  it("renders toggleable columns normally", () => {
    const cols: DataTableColumn<Row>[] = [
      { key: "name", header: "Name", cell: (row) => row.name, toggleable: false },
      { key: "amount", header: "Amount", cell: (row) => row.amount, label: "Amount label" },
    ]
    render(<DataTable data={rows} columns={cols} keyExtractor={(row) => row.id} />)
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Amount" })).toBeInTheDocument()
  })
})
