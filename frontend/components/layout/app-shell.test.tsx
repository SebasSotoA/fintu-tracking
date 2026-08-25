import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AppShell } from "./app-shell"
import { SIDEBAR_COLLAPSED_STORAGE_KEY } from "./app-sidebar-constants"
import type { Profile } from "@/lib/api/me"

vi.mock("@/hooks/use-me", () => ({
  useMe: (initial?: Profile) => ({ data: initial }),
}))

vi.mock("@/components/layout/app-nav", () => ({
  AppNav: ({ collapsed }: { collapsed: boolean }) => (
    <div data-testid="app-nav" data-collapsed={collapsed ? "true" : "false"} />
  ),
}))

vi.mock("@/components/layout/app-topbar", () => ({
  AppTopbar: () => <div data-testid="app-topbar" />,
}))

vi.mock("@/components/dashboard/notifications-bell", () => ({
  NotificationsBell: () => null,
}))

vi.mock("@/components/profile/account-menu", () => ({
  AccountMenu: () => null,
}))

vi.mock("@/components/onboarding/setup-modal", () => ({
  SetupModal: () => null,
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

describe("AppShell", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it("defaults to expanded when localStorage is empty", () => {
    renderWithProviders(
      <AppShell initialProfile={baseProfile}>
        <div>child</div>
      </AppShell>,
    )

    expect(screen.getByTestId("app-nav")).toHaveAttribute("data-collapsed", "false")
  })

  it("applies stored collapsed state after mount", async () => {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, "true")

    renderWithProviders(
      <AppShell initialProfile={baseProfile}>
        <div>child</div>
      </AppShell>,
    )

    await waitFor(() => {
      expect(screen.getByTestId("app-nav")).toHaveAttribute("data-collapsed", "true")
    })
  })

  it("does not overwrite stored collapsed state before hydration", async () => {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, "true")

    renderWithProviders(
      <AppShell initialProfile={baseProfile}>
        <div>child</div>
      </AppShell>,
    )

    await waitFor(() => {
      expect(localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe("true")
    })
  })

  it("uses duration-150 ease-in-out for sidebar margin transition", () => {
    renderWithProviders(
      <AppShell initialProfile={baseProfile}>
        <div>child</div>
      </AppShell>,
    )

    const main = screen.getByRole("main")
    const wrapper = main.parentElement as HTMLElement
    expect(wrapper.className).toContain("duration-150")
    expect(wrapper.className).toContain("ease-in-out")
  })
})
