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

const renderMobileCard = (row: Row) => (
  <div>
    <p data-testid="card-name">{row.name}</p>
    <p data-testid="card-amount">{row.amount}</p>
  </div>
)

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

  it("renders mobile cards below md when renderMobileCard is provided", () => {
    render(
      <DataTable
        data={rows}
        columns={columns}
        keyExtractor={(row) => row.id}
        renderMobileCard={renderMobileCard}
      />,
    )

    const cardList = screen.getByTestId("data-table-cards")
    expect(cardList).toBeInTheDocument()
    expect(cardList).toHaveClass("md:hidden")
    expect(screen.getAllByTestId("card-name")).toHaveLength(2)
    expect(screen.getByTestId("data-table-table")).toHaveClass("hidden", "md:block")
  })

  it("applies rowClassName to mobile card wrappers", () => {
    render(
      <DataTable
        data={rows}
        columns={columns}
        keyExtractor={(row) => row.id}
        rowClassName="highlight-row"
        renderMobileCard={renderMobileCard}
      />,
    )

    const wrappers = screen.getByTestId("data-table-cards").children
    expect(wrappers).toHaveLength(2)
    Array.from(wrappers).forEach((wrapper) => {
      expect(wrapper).toHaveClass("highlight-row")
    })
  })

  it("applies function rowClassName to mobile card wrappers", () => {
    render(
      <DataTable
        data={rows}
        columns={columns}
        keyExtractor={(row) => row.id}
        rowClassName={(row) => (row.amount > 100 ? "high" : "low")}
        renderMobileCard={renderMobileCard}
      />,
    )

    const wrappers = screen.getByTestId("data-table-cards").children
    expect(wrappers[0]).toHaveClass("low")
    expect(wrappers[1]).toHaveClass("high")
  })

  it("does not render mobile cards when renderMobileCard is omitted", () => {
    render(<DataTable data={rows} columns={columns} keyExtractor={(row) => row.id} />)
    expect(screen.queryByTestId("data-table-cards")).not.toBeInTheDocument()
    expect(screen.getByTestId("data-table-table")).not.toHaveClass("hidden", "md:block")
  })

  it("renders empty state when data is empty even with renderMobileCard", () => {
    render(
      <DataTable
        data={[]}
        columns={columns}
        emptyState={<p>No cards</p>}
        renderMobileCard={renderMobileCard}
      />,
    )
    expect(screen.getByText("No cards")).toBeInTheDocument()
    expect(screen.queryByTestId("data-table-cards")).not.toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })
})
