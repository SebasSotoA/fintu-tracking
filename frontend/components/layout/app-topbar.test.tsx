import { describe, expect, it, vi, beforeAll } from "vitest"
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AppTopbar } from "./app-topbar"
import type { Profile } from "@/lib/api/me"

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}))

const mockSignOut = vi.fn()
const mockMutateAsync = vi.fn()

vi.mock("@/hooks/use-sign-out", () => ({
  useSignOut: () => mockSignOut,
}))

vi.mock("@/hooks/use-update-profile", () => ({
  useUpdateProfile: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const baseProfile: Profile = {
  id: "profile-1",
  user_id: "user-1",
  country: "co",
  broker_preset_id: "hapi-colombia",
  onboarding_completed: true,
  onboarding_step: "done",
  created_at: "",
  updated_at: "",
}

function renderWithProviders(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
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
    renderWithProviders(<AppTopbar profile={baseProfile} />)
    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument()
  })

  it("renders the notifications bell and the account menu trigger", () => {
    renderWithProviders(<AppTopbar profile={baseProfile} />)
    expect(screen.getByTestId("notifications-bell")).toBeInTheDocument()
    expect(screen.getByTestId("my-account-button-topbar")).toBeInTheDocument()
  })
})