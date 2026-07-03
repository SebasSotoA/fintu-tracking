import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"
import AppLayout from "./layout"

vi.mock("@/components/auth/protected-layout", () => ({
  ProtectedLayout: ({ children }: { children: ReactNode }) => (
    <div data-testid="protected-layout">{children}</div>
  ),
}))

function renderLayout() {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <AppLayout>
        <div data-testid="child">child</div>
      </AppLayout>
    </QueryClientProvider>,
  )
}

describe("AppLayout", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("wraps children in ProtectedLayout", () => {
    renderLayout()
    expect(screen.getByTestId("protected-layout")).toBeInTheDocument()
    expect(screen.getByTestId("child")).toBeInTheDocument()
  })
})
