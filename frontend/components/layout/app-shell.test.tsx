import { describe, expect, it, vi, beforeEach, afterEach, beforeAll } from "vitest"
import { act, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactElement, ReactNode } from "react"
import { AppShell } from "./app-shell"
import { SIDEBAR_COLLAPSED_STORAGE_KEY } from "./app-sidebar-constants"
import { useLocale } from "@/components/locale-provider"
import { LOCALE_COOKIE_NAME } from "@/lib/i18n/cookie"
import { renderWithLocale } from "@/lib/i18n/test-utils"
import type { Profile } from "@/lib/api/me"
import { useUpdateProfile } from "@/hooks/use-update-profile"
import {
  productIntroPendingKey,
  productIntroSeenKey,
  productTourStepKey,
} from "@/components/onboarding/product-intro-storage"

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

const setupModalApi = vi.hoisted(() => ({
  complete: undefined as ((profile: Profile) => void) | undefined,
  forceOpen: false,
}))

const navigationState = vi.hoisted(() => ({
  pathname: "/dashboard",
}))

const previewState = vi.hoisted(() => ({
  setup: false,
  intro: false,
}))

vi.mock("@/components/onboarding/setup-modal", () => ({
  SetupModal: ({
    onSetupComplete,
    forceOpen,
  }: {
    onSetupComplete?: (profile: Profile) => void
    forceOpen?: boolean
  }) => {
    setupModalApi.complete = onSetupComplete
    setupModalApi.forceOpen = Boolean(forceOpen)
    return forceOpen ? <div data-testid="setup-modal-preview" /> : null
  },
}))

vi.mock("@/lib/dev/onboarding-preview", () => ({
  parseDevOnboardingPreview: () => ({ setup: previewState.setup, intro: previewState.intro }),
}))

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
}))

vi.mock("@/hooks/use-update-profile")

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = vi.fn()
  HTMLElement.prototype.setPointerCapture = vi.fn()
  HTMLElement.prototype.releasePointerCapture = vi.fn()
})

const mockMutate = vi.fn()
const mockUseUpdateProfile = {
  mutate: mockMutate,
  mutateAsync: vi.fn(),
  isPending: false,
} as unknown as ReturnType<typeof useUpdateProfile>

const baseProfile: Profile = {
  id: "profile-1",
  user_id: "user-1",
  country: "co",
  broker_preset_id: "hapi-colombia",
  locale: "en",
  onboarding_completed: true,
  onboarding_step: "done",
  created_at: "",
  updated_at: "",
}

function stubTourLayoutApis(): void {
  Element.prototype.getBoundingClientRect = function () {
    return {
      width: 80,
      height: 40,
      top: 20,
      left: 20,
      bottom: 60,
      right: 100,
      x: 20,
      y: 20,
      toJSON() {},
    } as DOMRect
  }
  Element.prototype.getClientRects = function () {
    return [{ width: 80, height: 40 }] as unknown as DOMRectList
  }
  HTMLElement.prototype.scrollIntoView = vi.fn()
}

function tourAnchors(): ReactElement {
  return (
    <>
      <div data-tour="net-worth">nw</div>
      <button type="button" data-tour="add-cash">
        cash
      </button>
      <button type="button" data-tour="add-trade">
        trade
      </button>
      <a href="/performance" data-tour="nav-performance">
        Performance
      </a>
      <div>child</div>
    </>
  )
}

function renderWithProviders(ui: ReactElement, locale: "en" | "es" = "en") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return renderWithLocale(ui, { locale, wrapper: QueryWrapper })
}

describe("AppShell", () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    setupModalApi.complete = undefined
    setupModalApi.forceOpen = false
    navigationState.pathname = "/dashboard"
    previewState.setup = false
    previewState.intro = false
    mockMutate.mockReset()
    vi.mocked(useUpdateProfile).mockReturnValue(mockUseUpdateProfile)
    stubTourLayoutApis()
  })

  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    document.cookie = `${LOCALE_COOKIE_NAME}=; path=/; max-age=0`
    document.documentElement.lang = "en"
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

  it("applies profile.locale when it is set", async () => {
    renderWithProviders(
      <AppShell initialProfile={{ ...baseProfile, locale: "es" }}>
        <div>child</div>
      </AppShell>,
      "en",
    )

    await waitFor(() => {
      expect(document.documentElement.lang).toBe("es")
    })
    expect(document.cookie).toContain(`${LOCALE_COOKIE_NAME}=es`)
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it("persists the current locale once when profile.locale is null", async () => {
    const { rerender } = renderWithProviders(
      <AppShell initialProfile={{ ...baseProfile, locale: null }}>
        <div>child</div>
      </AppShell>,
      "es",
    )

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledTimes(1)
    })
    expect(mockMutate).toHaveBeenCalledWith({ locale: "es" })
    expect(document.documentElement.lang).toBe("es")

    rerender(
      <AppShell initialProfile={{ ...baseProfile, locale: null }}>
        <div>child</div>
      </AppShell>,
    )

    expect(mockMutate).toHaveBeenCalledTimes(1)
  })

  it("does not revert a local locale change while profile.locale is still the previous value", async () => {
    const user = userEvent.setup()

    function FlipLocale() {
      const { setLocale } = useLocale()
      return (
        <button type="button" onClick={() => setLocale("es")}>
          flip-es
        </button>
      )
    }

    renderWithProviders(
      <AppShell initialProfile={baseProfile}>
        <FlipLocale />
      </AppShell>,
      "en",
    )

    await user.click(screen.getByRole("button", { name: "flip-es" }))

    await waitFor(() => {
      expect(document.documentElement.lang).toBe("es")
    })
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it("does not show the product intro for an already onboarded profile on mount", async () => {
    renderWithProviders(
      <AppShell initialProfile={baseProfile}>
        <div>child</div>
      </AppShell>,
    )

    await waitFor(() => {
      expect(screen.getByTestId("app-nav")).toBeInTheDocument()
    })
    expect(screen.queryByRole("heading", { name: "The question" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Skip intro" })).not.toBeInTheDocument()
  })

  it("opens the product intro after setup completes when the seen key is absent", async () => {
    renderWithProviders(
      <AppShell initialProfile={{ ...baseProfile, onboarding_completed: false }}>
        {tourAnchors()}
      </AppShell>,
    )

    expect(setupModalApi.complete).toBeTypeOf("function")

    act(() => {
      setupModalApi.complete?.({ ...baseProfile, onboarding_completed: true })
    })

    expect(await screen.findByRole("heading", { name: "The question" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Skip intro" })).toBeInTheDocument()
  })

  it("writes the seen key and hides the intro when Skip is clicked", async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <AppShell initialProfile={{ ...baseProfile, onboarding_completed: false }}>
        {tourAnchors()}
      </AppShell>,
    )

    act(() => {
      setupModalApi.complete?.({ ...baseProfile, onboarding_completed: true })
    })

    await screen.findByRole("heading", { name: "The question" })
    await user.click(screen.getByRole("button", { name: "Skip intro" }))

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "The question" })).not.toBeInTheDocument()
    })
    expect(localStorage.getItem(productIntroSeenKey("user-1"))).toBe("1")
    expect(sessionStorage.getItem(productIntroPendingKey("user-1"))).toBeNull()
  })

  it("opens the intro on mount when pending is set, onboarded, and not on subscription", async () => {
    sessionStorage.setItem(productIntroPendingKey("user-1"), "1")

    renderWithProviders(
      <AppShell initialProfile={baseProfile}>
        {tourAnchors()}
      </AppShell>,
    )

    expect(await screen.findByRole("heading", { name: "The question" })).toBeInTheDocument()
  })

  it("does not open the pending intro on the subscription route", async () => {
    navigationState.pathname = "/subscription"
    sessionStorage.setItem(productIntroPendingKey("user-1"), "1")

    renderWithProviders(
      <AppShell initialProfile={baseProfile}>
        <div>child</div>
      </AppShell>,
    )

    await waitFor(() => {
      expect(screen.getByTestId("app-nav")).toBeInTheDocument()
    })
    expect(screen.queryByRole("heading", { name: "The question" })).not.toBeInTheDocument()
  })

  it("does not show the intro on mount when the seen key is set even if pending", async () => {
    localStorage.setItem(productIntroSeenKey("user-1"), "1")
    sessionStorage.setItem(productIntroPendingKey("user-1"), "1")

    renderWithProviders(
      <AppShell initialProfile={baseProfile}>
        <div>child</div>
      </AppShell>,
    )

    await waitFor(() => {
      expect(screen.getByTestId("app-nav")).toBeInTheDocument()
    })
    expect(screen.queryByRole("heading", { name: "The question" })).not.toBeInTheDocument()
  })

  it("writes the seen key when Get started is clicked", async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <AppShell initialProfile={{ ...baseProfile, onboarding_completed: false }}>
        {tourAnchors()}
      </AppShell>,
    )

    act(() => {
      setupModalApi.complete?.({ ...baseProfile, onboarding_completed: true })
    })

    await screen.findByRole("heading", { name: "The question" })
    await user.click(screen.getByRole("button", { name: "Next" }))
    await user.click(screen.getByRole("button", { name: "Next" }))
    await user.click(screen.getByRole("button", { name: "Next" }))
    await user.click(screen.getByRole("button", { name: "Get started" }))

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "The question" })).not.toBeInTheDocument()
    })
    expect(localStorage.getItem(productIntroSeenKey("user-1"))).toBe("1")
    expect(sessionStorage.getItem(productIntroPendingKey("user-1"))).toBeNull()
  })

  it("shows the setup modal for an onboarded user when the dev setup preview is on", async () => {
    previewState.setup = true

    renderWithProviders(
      <AppShell initialProfile={baseProfile}>
        <div>child</div>
      </AppShell>,
    )

    expect(await screen.findByTestId("setup-modal-preview")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "The question" })).not.toBeInTheDocument()
  })

  it("opens the intro for an onboarded user when the dev intro preview is on even if already seen", async () => {
    previewState.intro = true
    localStorage.setItem(productIntroSeenKey("user-1"), "1")

    renderWithProviders(
      <AppShell initialProfile={baseProfile}>
        {tourAnchors()}
      </AppShell>,
    )

    expect(await screen.findByRole("heading", { name: "The question" })).toBeInTheDocument()
  })

  it("plays setup then intro when both preview flags are on even if already seen", async () => {
    previewState.setup = true
    previewState.intro = true
    localStorage.setItem(productIntroSeenKey("user-1"), "1")

    renderWithProviders(
      <AppShell initialProfile={baseProfile}>
        {tourAnchors()}
      </AppShell>,
    )

    expect(await screen.findByTestId("setup-modal-preview")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "The question" })).not.toBeInTheDocument()

    act(() => {
      setupModalApi.complete?.({ ...baseProfile, onboarding_completed: true })
    })

    expect(await screen.findByRole("heading", { name: "The question" })).toBeInTheDocument()
  })

  it("does not mount the tour off /dashboard and keeps pending plus step", async () => {
    const user = userEvent.setup()
    sessionStorage.setItem(productIntroPendingKey("user-1"), "1")

    const { rerender } = renderWithProviders(
      <AppShell initialProfile={baseProfile}>{tourAnchors()}</AppShell>,
    )

    await screen.findByRole("heading", { name: "The question" })
    await user.click(screen.getByRole("button", { name: "Next" }))
    await screen.findByRole("heading", { name: "Record cash" })

    navigationState.pathname = "/trades"
    rerender(<AppShell initialProfile={baseProfile}>{tourAnchors()}</AppShell>)

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "The question" })).not.toBeInTheDocument()
    })
    expect(screen.queryByRole("heading", { name: "Record cash" })).not.toBeInTheDocument()
    expect(sessionStorage.getItem(productIntroPendingKey("user-1"))).toBe("1")
    expect(localStorage.getItem(productIntroSeenKey("user-1"))).toBeNull()
    expect(sessionStorage.getItem(productTourStepKey("user-1"))).toBe("2")

    navigationState.pathname = "/dashboard"
    rerender(<AppShell initialProfile={baseProfile}>{tourAnchors()}</AppShell>)

    expect(await screen.findByRole("heading", { name: "Record cash" })).toBeInTheDocument()
    expect(sessionStorage.getItem(productIntroPendingKey("user-1"))).toBe("1")
    expect(localStorage.getItem(productIntroSeenKey("user-1"))).toBeNull()
  })
})
