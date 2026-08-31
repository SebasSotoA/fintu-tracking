import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { CashFlow } from "@/lib/types"
import { FeesBreakdown } from "./fees-breakdown"

const mockListCashFlows = vi.fn()
const mockGetFeeBreakdown = vi.fn()

vi.mock("@/lib/api/cash-flows", () => ({
  listCashFlowsForExport: (...args: unknown[]) => mockListCashFlows(...args),
}))

vi.mock("@/lib/api/analytics", () => ({
  getFeeBreakdown: (...args: unknown[]) => mockGetFeeBreakdown(...args),
}))

const emptyFeeBreakdown = {
  deposit_fees: "0",
  trading_fees: "0",
  closing_fees: "0",
  maintenance_fees: "0",
  other_fees: "0",
  total_fees: "0",
  fees_by_month: {},
}

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
    mockGetFeeBreakdown.mockResolvedValue(emptyFeeBreakdown)
  })

  it("shows transfer from cash flows and trading from fee-breakdown", async () => {
    mockListCashFlows.mockResolvedValue([
      cashFlow({ id: "f1", usd_amount: "7.96", related_type: "deposit" }),
    ])
    mockGetFeeBreakdown.mockResolvedValue({
      ...emptyFeeBreakdown,
      trading_fees: "12.00",
    })
    renderFees()

    expect(await screen.findByText("Fees paid")).toBeInTheDocument()
    expect(screen.getByText("Transfer")).toBeInTheDocument()
    expect(screen.getByText("$7.96")).toBeInTheDocument()
    expect(screen.getByText("Trading")).toBeInTheDocument()
    expect(screen.getByText("$12.00")).toBeInTheDocument()
    expect(screen.getByText("$19.96")).toBeInTheDocument()
  })

  it("shows warning when standalone fees exist", async () => {
    mockListCashFlows.mockResolvedValue([cashFlow({ related_type: "standalone" })])
    renderFees()

    expect(await screen.findByText(/unlinked fee row/i)).toBeInTheDocument()
  })

  it("links to full breakdown on /cash-flows with foreground not primary", async () => {
    renderFees()

    const link = await screen.findByRole("link", { name: /view full breakdown/i })
    expect(link).toHaveAttribute("href", "/cash-flows")
    expect(link.className).toContain("text-foreground")
    expect(link.className).not.toContain("text-primary")
  })

  it("renders grand total in text-foreground not text-destructive", async () => {
    mockListCashFlows.mockResolvedValue([
      cashFlow({ id: "f1", usd_amount: "7.96", related_type: "deposit" }),
    ])
    mockGetFeeBreakdown.mockResolvedValue({
      ...emptyFeeBreakdown,
      trading_fees: "12.00",
    })
    renderFees()

    const total = await screen.findByText("$19.96")
    expect(total).toHaveClass("text-foreground")
    expect(total).not.toHaveClass("text-destructive")
  })

  it("does not add trade-related cash-flow fees into trading when fee-breakdown is the source", async () => {
    mockListCashFlows.mockResolvedValue([
      cashFlow({ id: "f1", usd_amount: "7.96", related_type: "deposit" }),
      cashFlow({ id: "f2", usd_amount: "2.50", related_type: "trade" }),
    ])
    mockGetFeeBreakdown.mockResolvedValue({
      ...emptyFeeBreakdown,
      trading_fees: "12.00",
    })
    renderFees()

    expect(await screen.findByText("$19.96")).toBeInTheDocument()
    expect(screen.getByText("$12.00")).toBeInTheDocument()
    expect(screen.queryByText("$2.50")).not.toBeInTheDocument()
    expect(screen.queryByText("$22.46")).not.toBeInTheDocument()
  })

  it("includes withdrawal cash-flow fees in transfer not trading", async () => {
    mockListCashFlows.mockResolvedValue([
      cashFlow({ id: "f1", usd_amount: "3.00", related_type: "withdrawal" }),
    ])
    mockGetFeeBreakdown.mockResolvedValue({
      ...emptyFeeBreakdown,
      trading_fees: "1.00",
    })
    renderFees()

    expect(await screen.findByText("$3.00")).toBeInTheDocument()
    expect(screen.getByText("$1.00")).toBeInTheDocument()
    expect(screen.getByText("$4.00")).toBeInTheDocument()
  })
}
)