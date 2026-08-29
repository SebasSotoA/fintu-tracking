import { describe, expect, it, vi, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { TickerLogo } from "./ticker-logo"

vi.mock("next/image", () => ({
  default: ({ alt, onError, src }: { alt: string; src: string; onError?: () => void }) => (
    <img
      data-testid="next-image"
      data-src={src}
      alt={alt}
      onError={onError}
    />
  ),
}))

describe("TickerLogo", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders the nvstly ticker_icons image for a stock ticker", () => {
    render(<TickerLogo ticker="AAPL" assetType="stock" />)
    const img = screen.getByTestId("next-image")
    expect(img.getAttribute("data-src")).toBe(
      "https://raw.githubusercontent.com/nvstly/icons/main/ticker_icons/AAPL.png",
    )
  })

  it("renders the nvstly crypto_icons image for a crypto ticker", () => {
    render(<TickerLogo ticker="BTC" assetType="crypto" />)
    const img = screen.getByTestId("next-image")
    expect(img.getAttribute("data-src")).toBe(
      "https://raw.githubusercontent.com/nvstly/icons/main/crypto_icons/BTC.png",
    )
  })

  it("renders the nvstly ticker_icons image for an ETF ticker", () => {
    render(<TickerLogo ticker="QQQ" assetType="etf" />)
    const img = screen.getByTestId("next-image")
    expect(img.getAttribute("data-src")).toBe(
      "https://raw.githubusercontent.com/nvstly/icons/main/ticker_icons/QQQ.png",
    )
  })

  it("renders the fallback icon when no ticker is provided", () => {
    const { container } = render(<TickerLogo ticker="" />)
    expect(screen.queryByTestId("next-image")).not.toBeInTheDocument()
    expect(container.querySelector("svg")).toBeInTheDocument()
  })

  it("falls back to the icon when the image errors", () => {
    const { container } = render(<TickerLogo ticker="AAPL" assetType="stock" />)
    const img = screen.getByTestId("next-image")
    expect(img).toBeInTheDocument()
    fireEvent.error(img)
    expect(screen.queryByTestId("next-image")).not.toBeInTheDocument()
    expect(container.querySelector("svg")).toBeInTheDocument()
  })
})
