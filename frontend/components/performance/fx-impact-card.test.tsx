import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { FxImpactCard } from "./fx-impact-card"

const mockGetFxImpact = vi.fn()

vi.mock("@/lib/api/analytics", () => ({
  getFxImpact: (...args: unknown[]) => mockGetFxImpact(...args),
}))

const baseFxImpact = {
  avg_investment_rate: "4000",
  current_rate: "4100",
  rate_change_pct: "2.50",
  fx_impact_usd: "12.40",
  fx_impact_pct: "0.12",
  impact_by_period: {},
}

function renderCard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <FxImpactCard />
    </QueryClientProvider>,
  )
}

describe("FxImpactCard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFxImpact.mockResolvedValue(baseFxImpact)
  })

  it("does not render FX made you or FX cost you copy", async () => {
    renderCard()
    expect(await screen.findByText("FX impact")).toBeInTheDocument()
    expect(screen.queryByText(/fx made you/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/fx cost you/i)).not.toBeInTheDocument()
  })

  it("renders the signed FX amount in text-foreground", async () => {
    renderCard()
    const amount = await screen.findByText("+$12.40")
    expect(amount).toHaveClass("text-foreground")
    expect(amount).not.toHaveClass("text-success")
    expect(amount).not.toHaveClass("text-destructive")
  })

  it("uses text-foreground not text-primary on View FX details", async () => {
    renderCard()
    const link = await screen.findByRole("link", { name: /view fx details/i })
    expect(link).toHaveClass("text-foreground")
    expect(link).not.toHaveClass("text-primary")
    expect(link).toHaveAttribute("href", "/cash-flows")
  })
})
