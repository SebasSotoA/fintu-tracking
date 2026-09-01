import { describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import { ActivityFeedItem } from "./activity-feed-item"
import type { ActivityItem } from "@/lib/api/activity"
import { renderWithLocale } from "@/lib/i18n/test-utils"

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
    renderWithLocale(<ActivityFeedItem item={makeTrade({ ticker: "BTC", asset_type: "crypto" })} />)
    const logo = screen.getByTestId("ticker-logo")
    expect(logo.getAttribute("data-ticker")).toBe("BTC")
    expect(logo.getAttribute("data-asset-type")).toBe("crypto")
  })

  it("uses text-foreground on the activity title", () => {
    renderWithLocale(<ActivityFeedItem item={makeTrade()} />)
    expect(screen.getByText("Buy").className).toContain("text-foreground")
  })

  it("passes asset_type to TickerLogo for a stock trade", () => {
    renderWithLocale(<ActivityFeedItem item={makeTrade({ ticker: "AAPL", asset_type: "stock" })} />)
    const logo = screen.getByTestId("ticker-logo")
    expect(logo.getAttribute("data-ticker")).toBe("AAPL")
    expect(logo.getAttribute("data-asset-type")).toBe("stock")
  })

  it("falls back to null assetType when asset_type is absent", () => {
    const item = makeTrade({ ticker: "AAPL" })
    delete item.asset_type
    renderWithLocale(<ActivityFeedItem item={item} />)
    const logo = screen.getByTestId("ticker-logo")
    expect(logo.getAttribute("data-asset-type")).toBe("")
  })

  it("formats older dates with English month abbreviations", () => {
    renderWithLocale(<ActivityFeedItem item={makeTrade({ date: "2026-01-15" })} />)
    expect(screen.getByText(/jan/i)).toBeInTheDocument()
    expect(screen.queryByText(/ene/i)).not.toBeInTheDocument()
  })

  it("formats older dates with Spanish month abbreviations when locale is es", () => {
    renderWithLocale(<ActivityFeedItem item={makeTrade({ date: "2026-01-15" })} />, { locale: "es" })
    expect(screen.getByText(/ene/i)).toBeInTheDocument()
    expect(screen.queryByText(/jan/i)).not.toBeInTheDocument()
  })
})
