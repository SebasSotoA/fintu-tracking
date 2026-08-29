import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { ActivityFeedItem } from "./activity-feed-item"
import type { ActivityItem } from "@/lib/api/activity"

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock("@/components/ui/ticker-logo", () => ({
  TickerLogo: ({ ticker, assetType }: { ticker: string; assetType?: string | null }) => (
    <div data-testid="ticker-logo" data-ticker={ticker} data-asset-type={assetType ?? ""} />
  ),
}))

function makeTrade(overrides: Partial<ActivityItem> = {}): ActivityItem {
  return {
    id: "1",
    date: "2026-01-01",
    kind: "trade",
    sub_kind: "buy",
    ticker: "BTC",
    asset_type: "crypto",
    direction: "out",
    amount_usd: "500.00",
    details: "buy 0.01 BTC @ $50000",
    ...overrides,
  }
}

describe("ActivityFeedItem", () => {
  it("passes asset_type to TickerLogo for a crypto trade", () => {
    render(<ActivityFeedItem item={makeTrade({ ticker: "BTC", asset_type: "crypto" })} />)
    const logo = screen.getByTestId("ticker-logo")
    expect(logo.getAttribute("data-ticker")).toBe("BTC")
    expect(logo.getAttribute("data-asset-type")).toBe("crypto")
  })

  it("passes asset_type to TickerLogo for a stock trade", () => {
    render(<ActivityFeedItem item={makeTrade({ ticker: "AAPL", asset_type: "stock" })} />)
    const logo = screen.getByTestId("ticker-logo")
    expect(logo.getAttribute("data-ticker")).toBe("AAPL")
    expect(logo.getAttribute("data-asset-type")).toBe("stock")
  })

  it("falls back to null assetType when asset_type is absent", () => {
    const item = makeTrade({ ticker: "AAPL" })
    delete item.asset_type
    render(<ActivityFeedItem item={item} />)
    const logo = screen.getByTestId("ticker-logo")
    expect(logo.getAttribute("data-asset-type")).toBe("")
  })
})
