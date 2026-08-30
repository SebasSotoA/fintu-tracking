import { describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import type { Trade } from "@/lib/types"
import { DeleteTradeDialog } from "./delete-trade-dialog"

vi.mock("@/lib/api/trades", () => ({
  deleteTrade: vi.fn(),
}))

const trade: Trade = {
  id: "trade-1",
  user_id: "user-1",
  date: "2026-06-15",
  ticker: "AAPL",
  asset_type: "stock",
  side: "buy",
  quantity: "10",
  price: "150.00",
  deposit_fee: "0",
  trading_fee: "1.00",
  closing_fee: "0",
  total_fees: "1.00",
  total: "1501.00",
  broker_id: null,
  notes: null,
  created_at: "2026-06-15T10:00:00Z",
  updated_at: "2026-06-15T10:00:00Z",
}

describe("DeleteTradeDialog", () => {
  it("renders Cancel and Delete inside the alert dialog footer", () => {
    render(
      <DeleteTradeDialog
        trade={trade}
        open
        onOpenChange={vi.fn()}
        onSuccess={vi.fn()}
      />,
    )

    const footer = document.querySelector("[data-slot=alert-dialog-footer]")
    expect(footer).toBeTruthy()
    expect(within(footer as HTMLElement).getByRole("button", { name: "Cancel" })).toBeInTheDocument()
    expect(within(footer as HTMLElement).getByRole("button", { name: "Delete" })).toBeInTheDocument()
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
  })
})
