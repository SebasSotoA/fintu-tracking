import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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
  usd_converted: "1130.00",
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

  it("renders formatted USD from COP deposits", async () => {
    renderCard()
    expect(await screen.findByText("USD from COP deposits")).toBeInTheDocument()
    expect(screen.getByText("$1,130.00")).toBeInTheDocument()
  })

  it("shows FX impact tooltip that mentions deposits and not a cash loss", async () => {
    const user = userEvent.setup()
    renderCard()
    await screen.findByText("FX impact")
    await user.hover(screen.getByRole("button", { name: /about fx impact/i }))
    const tooltip = await screen.findByRole("tooltip")
    expect(tooltip).toHaveTextContent(/deposits/i)
    expect(tooltip).toHaveTextContent(/not a cash (gain or )?loss/i)
  })

  it("shows USD from COP deposits tooltip that mentions deposited pesos and not net worth", async () => {
    const user = userEvent.setup()
    renderCard()
    await screen.findByText("USD from COP deposits")
    await user.hover(screen.getByRole("button", { name: /about usd from cop deposits/i }))
    const tooltip = await screen.findByRole("tooltip")
    expect(tooltip).toHaveTextContent(/pesos/i)
    expect(tooltip).toHaveTextContent(/deposited/i)
    expect(tooltip).toHaveTextContent(/not.*net worth/i)
    expect(tooltip).not.toHaveTextContent(/usd_amount/i)
  })
})
