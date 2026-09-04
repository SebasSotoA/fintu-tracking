import { describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderWithLocale } from "@/lib/i18n/test-utils"
import { TablePagination } from "./table-pagination"

describe("TablePagination", () => {
  it("renders page size selector and page info", () => {
    renderWithLocale(
      <TablePagination page={1} pageSize={10} total={25} onPageChange={vi.fn()} onPageSizeChange={vi.fn()} />,
    )
    expect(screen.getByRole("combobox", { name: "Rows per page" })).toBeInTheDocument()
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument()
  })

  it("renders Spanish table chrome when locale is es", () => {
    renderWithLocale(
      <TablePagination page={1} pageSize={10} total={25} onPageChange={vi.fn()} onPageSizeChange={vi.fn()} />,
      { locale: "es" },
    )
    expect(screen.getByRole("combobox", { name: "Filas por página" })).toBeInTheDocument()
    expect(screen.getByText("Página 1 de 3")).toBeInTheDocument()
  })

  it("navigation buttons have a minimum 44px mobile tap target", () => {
    renderWithLocale(
      <TablePagination page={2} pageSize={10} total={25} onPageChange={vi.fn()} onPageSizeChange={vi.fn()} />,
    )

    const buttons = [
      screen.getByRole("button", { name: "First page" }),
      screen.getByRole("button", { name: "Previous page" }),
      screen.getByRole("button", { name: "Next page" }),
      screen.getByRole("button", { name: "Last page" }),
    ]

    buttons.forEach((button) => {
      expect(button).toHaveClass("min-h-11", "min-w-11")
      expect(button.className).toContain("text-foreground")
    })
  })

  it("calls onPageChange when navigation buttons are clicked", async () => {
    const onPageChange = vi.fn()
    renderWithLocale(
      <TablePagination page={2} pageSize={10} total={25} onPageChange={onPageChange} onPageSizeChange={vi.fn()} />,
    )

    await userEvent.click(screen.getByRole("button", { name: "First page" }))
    expect(onPageChange).toHaveBeenCalledWith(1)

    await userEvent.click(screen.getByRole("button", { name: "Previous page" }))
    expect(onPageChange).toHaveBeenCalledWith(1)

    await userEvent.click(screen.getByRole("button", { name: "Next page" }))
    expect(onPageChange).toHaveBeenCalledWith(3)

    await userEvent.click(screen.getByRole("button", { name: "Last page" }))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it("disables first and previous buttons on the first page", () => {
    renderWithLocale(
      <TablePagination page={1} pageSize={10} total={25} onPageChange={vi.fn()} onPageSizeChange={vi.fn()} />,
    )

    expect(screen.getByRole("button", { name: "First page" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "Last page" })).toBeEnabled()
  })
})
