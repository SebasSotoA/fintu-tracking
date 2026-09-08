import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
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

  it("renders a button for sortable headers and not for others", () => {
    const cols: DataTableColumn<Row>[] = [
      { key: "name", header: "Name", sortable: true, cell: (row) => row.name },
      { key: "amount", header: "Amount", cell: (row) => row.amount },
    ]
    render(<DataTable data={rows} columns={cols} keyExtractor={(row) => row.id} />)
    expect(screen.getByRole("button", { name: "Name" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Amount" })).not.toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument()
  })

  it("sets aria-sort on sortable column headers from the current sort", () => {
    const cols: DataTableColumn<Row>[] = [
      { key: "name", header: "Name", sortable: true, cell: (row) => row.name },
      { key: "amount", header: "Amount", sortable: true, cell: (row) => row.amount },
    ]
    render(
      <DataTable
        data={rows}
        columns={cols}
        keyExtractor={(row) => row.id}
        sort={{ key: "name", dir: "asc" }}
      />,
    )
    expect(screen.getByRole("columnheader", { name: "Name" })).toHaveAttribute(
      "aria-sort",
      "ascending",
    )
    expect(screen.getByRole("columnheader", { name: "Amount" })).toHaveAttribute(
      "aria-sort",
      "none",
    )
  })

  it("sets aria-sort descending when the active column is sorted desc", () => {
    const cols: DataTableColumn<Row>[] = [
      { key: "name", header: "Name", sortable: true, cell: (row) => row.name },
    ]
    render(
      <DataTable
        data={rows}
        columns={cols}
        keyExtractor={(row) => row.id}
        sort={{ key: "name", dir: "desc" }}
      />,
    )
    expect(screen.getByRole("columnheader", { name: "Name" })).toHaveAttribute(
      "aria-sort",
      "descending",
    )
  })

  it("hides the sort chevron from the accessibility tree", () => {
    const cols: DataTableColumn<Row>[] = [
      { key: "name", header: "Name", sortable: true, cell: (row) => row.name },
    ]
    render(
      <DataTable
        data={rows}
        columns={cols}
        keyExtractor={(row) => row.id}
        sort={{ key: "name", dir: "asc" }}
      />,
    )
    const button = screen.getByRole("button", { name: "Name" })
    const chevron = button.querySelector("svg")
    expect(chevron).not.toBeNull()
    expect(chevron).toHaveAttribute("aria-hidden", "true")
  })

  it("does not set aria-sort on non-sortable headers", () => {
    const cols: DataTableColumn<Row>[] = [
      { key: "name", header: "Name", cell: (row) => row.name },
      { key: "amount", header: "Amount", sortable: true, cell: (row) => row.amount },
    ]
    render(<DataTable data={rows} columns={cols} keyExtractor={(row) => row.id} />)
    expect(screen.getByRole("columnheader", { name: "Name" })).not.toHaveAttribute("aria-sort")
    expect(screen.getByRole("columnheader", { name: "Amount" })).toHaveAttribute("aria-sort", "none")
  })

  it("calls onSort with sortKey when a sortable header is clicked", () => {
    const onSort = vi.fn()
    const cols: DataTableColumn<Row>[] = [
      {
        key: "copWired",
        header: "COP",
        sortable: true,
        sortKey: "amount",
        cell: () => null,
      },
      { key: "name", header: "Name", cell: (row) => row.name },
    ]
    render(
      <DataTable
        data={rows}
        columns={cols}
        keyExtractor={(row) => row.id}
        sort={{ key: "date", dir: "desc" }}
        onSort={onSort}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "COP" }))
    expect(onSort).toHaveBeenCalledWith("amount")
  })

  it("does not apply data-row hover styles to the header row", () => {
    render(<DataTable data={rows} columns={columns} keyExtractor={(row) => row.id} />)
    const headerRow = document.querySelector('[data-slot="table-header"] tr')
    expect(headerRow).not.toBeNull()
    expect(headerRow).not.toHaveClass("cursor-pointer")
    expect(headerRow).not.toHaveClass("hover:bg-muted/80")
  })

  it("applies data-row hover styles via TableBody child selectors", () => {
    render(<DataTable data={rows} columns={columns} keyExtractor={(row) => row.id} />)
    const tableBody = document.querySelector('[data-slot="table-body"]')
    expect(tableBody).not.toBeNull()
    expect(tableBody).toHaveClass("[&_tr]:cursor-pointer")
    expect(tableBody).toHaveClass("[&_tr]:hover:bg-muted/80")
    expect(tableBody).toHaveClass("[&_tr]:hover:border-l-primary")
  })

  it("shows a pointer cursor on sortable header buttons only", () => {
    const cols: DataTableColumn<Row>[] = [
      { key: "name", header: "Name", sortable: true, cell: (row) => row.name },
      { key: "amount", header: "Amount", cell: (row) => row.amount },
    ]
    render(<DataTable data={rows} columns={cols} keyExtractor={(row) => row.id} />)
    expect(screen.getByRole("button", { name: "Name" })).toHaveClass("cursor-pointer")
    expect(screen.queryByRole("button", { name: "Amount" })).not.toBeInTheDocument()
  })
})
