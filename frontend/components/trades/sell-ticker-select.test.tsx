import type { ReactElement } from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SellTickerSelect } from "./sell-ticker-select"

vi.mock("@/lib/api/portfolio", () => ({
  getHoldings: () => Promise.resolve([]),
  getMarketPrice: () => Promise.resolve(null),
}))

function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe("SellTickerSelect", () => {
  it("CommandList has scrollbar-minimal class when popover opens", () => {
    renderWithProviders(
      <SellTickerSelect id="sell-ticker" value="" onChange={vi.fn()} />,
    )

    fireEvent.click(screen.getByRole("combobox", { name: /select ticker to sell/i }))
    const commandList = document.querySelector('[data-slot="command-list"]')
    expect(commandList).not.toBeNull()
    expect(commandList).toHaveClass("scrollbar-minimal")
  })
})
