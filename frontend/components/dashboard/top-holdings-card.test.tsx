import { describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import { renderWithLocale } from "@/lib/i18n/test-utils"
import { TopHoldingsCard } from "./top-holdings-card"
import type { Holding } from "@/lib/types"

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}))

const holdings: Holding[] = [
  {
    ticker: "AAPL",
    assetType: "stock",
    quantity: "10",
    avgCost: "150",
    totalInvested: "1500",
    marketValue: "1800",
    unrealizedPL: "300",
    unrealizedPLPercent: "20",
  },
  {
    ticker: "VOO",
    assetType: "etf",
    quantity: "5",
    avgCost: "400",
    totalInvested: "2000",
    marketValue: "2200",
    unrealizedPL: "200",
    unrealizedPLPercent: "10",
  },
  {
    ticker: "BTC",
    assetType: "crypto",
    quantity: "0.1",
    avgCost: "30000",
    totalInvested: "3000",
    marketValue: "4500",
    unrealizedPL: "1500",
    unrealizedPLPercent: "50",
  },
]

describe("TopHoldingsCard", () => {
  it("renders the title", () => {
    renderWithLocale(<TopHoldingsCard holdings={holdings} totalPortfolioValue={10000} />)
    expect(screen.getByText("Top Holdings")).toBeInTheDocument()
  })

  it("renders tickers sorted by market value descending", () => {
    renderWithLocale(<TopHoldingsCard holdings={holdings} totalPortfolioValue={10000} />)
    const tickerNodes = screen.getAllByText(/^(AAPL|VOO|BTC)$/)
    expect(tickerNodes[0]).toHaveTextContent("BTC")
    expect(tickerNodes[1]).toHaveTextContent("VOO")
    expect(tickerNodes[2]).toHaveTextContent("AAPL")
    expect(tickerNodes[0].className).toContain("text-foreground")
  })

  it("renders percentages of total portfolio", () => {
    renderWithLocale(<TopHoldingsCard holdings={holdings} totalPortfolioValue={10000} />)
    // 4500/10000 = 45%, 2200/10000 = 22%, 1800/10000 = 18%
    expect(screen.getByText("45.0%")).toBeInTheDocument()
    expect(screen.getByText("22.0%")).toBeInTheDocument()
    expect(screen.getByText("18.0%")).toBeInTheDocument()
  })

  it("respects the limit prop", () => {
    renderWithLocale(<TopHoldingsCard holdings={holdings} totalPortfolioValue={10000} limit={2} />)
    expect(screen.queryByText("AAPL")).not.toBeInTheDocument()
    expect(screen.getByText("BTC")).toBeInTheDocument()
    expect(screen.getByText("VOO")).toBeInTheDocument()
  })

  it("renders an empty state when there are no holdings", () => {
    renderWithLocale(<TopHoldingsCard holdings={[]} totalPortfolioValue={0} />)
    expect(screen.getByText(/no holdings yet/i)).toBeInTheDocument()
  })
})