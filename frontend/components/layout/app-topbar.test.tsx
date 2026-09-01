import { describe, expect, it, vi, beforeAll } from "vitest"
import { screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AppTopbar } from "./app-topbar"
import { renderWithLocale } from "@/lib/i18n/test-utils"

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}))

function renderWithProviders(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return renderWithLocale(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = vi.fn()
  HTMLElement.prototype.setPointerCapture = vi.fn()
  HTMLElement.prototype.releasePointerCapture = vi.fn()
})

describe("AppTopbar", () => {
  it("renders the active page title", () => {
    renderWithProviders(<AppTopbar />)
    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument()
  })

  it("renders the notifications bell", () => {
    renderWithProviders(<AppTopbar />)
    expect(screen.getByTestId("notifications-bell")).toBeInTheDocument()
  })
})