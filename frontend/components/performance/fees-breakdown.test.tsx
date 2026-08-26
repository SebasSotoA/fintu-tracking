import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { CashFlow } from "@/lib/types"
import { FeesBreakdown } from "./fees-breakdown"

const mockListCashFlows = vi.fn()

vi.mock("@/lib/api/cash-flows", () => ({
  listCashFlowsForExport: (...args: unknown[]) => mockListCashFlows(...args),
}))

function cashFlow(overrides: Partial<CashFlow>): CashFlow {
  return {
    id: "cf-1",
    user_id: "u1",
    date: "2026-06-01",
    type: "fee",
    currency: "USD",
    amount: "1.99",
    fx_rate: null,
    usd_amount: "1.99",
    broker_id: null,
    notes: null,
    fee_type: null,
    related_trade_id: null,
    related_cash_flow_id: null,
    related_type: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  }
}

function renderFees() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <FeesBreakdown />
    </QueryClientProvider>,
  )
}

describe("FeesBreakdown", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListCashFlows.mockResolvedValue([])
  })

  it("shows total fees paid with transfer and trading breakdown", async () => {
    mockListCashFlows.mockResolvedValue([
      cashFlow({ id: "f1", usd_amount: "1.99", related_type: "deposit" }),
      cashFlow({ id: "f2", usd_amount: "2.50", related_type: "trade" }),
    ])
    renderFees()

    expect(await screen.findByText("Fees paid")).toBeInTheDocument()
    expect(screen.getByText("$4.49")).toBeInTheDocument()
    expect(screen.getByText("Transfer")).toBeInTheDocument()
    expect(screen.getByText("$1.99")).toBeInTheDocument()
    expect(screen.getByText("Trading")).toBeInTheDocument()
    expect(screen.getByText("$2.50")).toBeInTheDocument()
  })

  it("shows warning when standalone fees exist", async () => {
    mockListCashFlows.mockResolvedValue([cashFlow({ related_type: "standalone" })])
    renderFees()

    expect(await screen.findByText(/unlinked fee row/i)).toBeInTheDocument()
  })

  it("links to full breakdown on /cash-flows", async () => {
    renderFees()

    const link = await screen.findByRole("link", { name: /view full breakdown/i })
    expect(link).toHaveAttribute("href", "/cash-flows")
  })
})