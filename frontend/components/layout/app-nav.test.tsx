import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AppNav } from "./app-nav"
import { renderWithLocale } from "@/lib/i18n/test-utils"
import type { Profile } from "@/lib/api/me"

const mockSignOut = vi.fn()

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "dark",
    setTheme: vi.fn(),
  }),
}))

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}))

vi.mock("@/hooks/use-sign-out", () => ({
  useSignOut: () => mockSignOut,
}))

vi.mock("@/hooks/use-update-profile", () => ({
  useUpdateProfile: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock("@/lib/market-config/market-config", () => ({
  MARKET_CONFIG: {
    defaultCountry: "co",
    defaultBrokerId: "hapi-colombia",
    baseCurrency: "USD",
  },
  SUPPORTED_COUNTRIES: ["co", "mx"],
  countryLabel: (country: string) => (country === "co" ? "Colombia" : "México"),
}))

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
    id,
  }: {
    value?: string
    onValueChange?: (value: string) => void
    children?: React.ReactNode
    id?: string
  }) => (
    <select id={id} value={value} onChange={(e) => onValueChange?.(e.target.value)}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <option value="">{placeholder}</option>,
}))

vi.mock("@/components/brokers/broker-select", () => ({
  BrokerSelect: ({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) => (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="hapi-colombia">Hapi</option>
    </select>
  ),
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

function renderAppNav(collapsed = false) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return renderWithLocale(
    <QueryClientProvider client={queryClient}>
      <AppNav collapsed={collapsed} onToggleCollapsed={vi.fn()} profile={baseProfile} />
    </QueryClientProvider>,
  )
}

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = vi.fn()
  HTMLElement.prototype.setPointerCapture = vi.fn()
  HTMLElement.prototype.releasePointerCapture = vi.fn()
})

describe("AppNav", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows My account and Portfolio labels in English on desktop sidebar", () => {
    renderAppNav(false)

    const sidebar = screen.getByTestId("app-sidebar")
    expect(within(sidebar).getByText("My account")).toBeInTheDocument()
    expect(within(sidebar).getByText("Portfolio")).toBeInTheDocument()
  })

  it("places My account at the bottom of the desktop sidebar", () => {
    renderAppNav(false)

    const sidebar = screen.getByTestId("app-sidebar")
    const children = Array.from(sidebar.children)
    const lastChild = children[children.length - 1]

    expect(within(lastChild as HTMLElement).getByText("My account")).toBeInTheDocument()
  })

  it("does not render standalone Sign Out in desktop sidebar", () => {
    renderAppNav(false)

    const sidebar = screen.getByTestId("app-sidebar")
    expect(within(sidebar).queryByRole("button", { name: "Sign Out" })).not.toBeInTheDocument()
    expect(within(sidebar).queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument()
  })

  it("shows Account label in English on mobile bottom nav", () => {
    renderAppNav(false)

    expect(screen.getByTestId("my-account-button-mobile")).toHaveTextContent("Account")
  })

  it("does not render Sign out in mobile bottom nav", () => {
    renderAppNav(false)

    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument()
  })

  it("uses duration-150 ease-in-out for sidebar width transition", () => {
    renderAppNav(false)

    const sidebar = screen.getByTestId("app-sidebar")
    expect(sidebar.className).toContain("duration-150")
    expect(sidebar.className).toContain("ease-in-out")
  })

  it("uses text-foreground on the active Dashboard link", () => {
    renderAppNav(false)

    const sidebar = screen.getByTestId("app-sidebar")
    const dashboardLink = within(sidebar).getByRole("link", { name: "Dashboard" })
    expect(dashboardLink.className).toContain("text-foreground")
  })

  it("keeps the active Dashboard icon inside the link with a primary-tinted press", () => {
    renderAppNav(false)

    const sidebar = screen.getByTestId("app-sidebar")
    const dashboardLink = within(sidebar).getByRole("link", { name: "Dashboard" })
    expect(dashboardLink.querySelector("svg")).toBeTruthy()
    expect(dashboardLink.className).toContain("bg-primary/10")
    expect(dashboardLink.className).toContain("gap-2")
    expect(dashboardLink).toHaveAttribute("aria-current", "page")
  })

  it("paints the collapsed active icon on a rounded primary-tinted cell", () => {
    renderAppNav(true)

    const sidebar = screen.getByTestId("app-sidebar")
    const dashboardLink = within(sidebar).getByRole("link", { name: "Dashboard" })
    const iconCell = dashboardLink.querySelector("svg")?.parentElement

    expect(dashboardLink.querySelector("svg")).toBeTruthy()
    expect(dashboardLink.className).not.toContain("gap-2")
    expect(iconCell?.className).toContain("rounded-md")
    expect(iconCell?.className).toContain("bg-primary/10")
  })

  it("uses muted-foreground idle classes on mobile bottom nav", () => {
    renderAppNav(false)

    const sidebar = screen.getByTestId("app-sidebar")
    const tradesLinks = screen.getAllByRole("link", { name: "Trades" })
    const mobileTrades = tradesLinks.find((el) => !sidebar.contains(el))

    expect(mobileTrades).toBeDefined()
    expect(mobileTrades?.className).toContain("text-muted-foreground")
    expect(mobileTrades?.className).toContain("hover:text-primary")
    expect(mobileTrades?.className).not.toContain("text-foreground/40")
    expect(mobileTrades?.className).toContain("focus-visible:ring-2")
  })

  it("opens profile config dialog when Configuration is selected from account menu", async () => {
    const user = userEvent.setup()
    renderAppNav(false)

    await user.click(screen.getByTestId("my-account-button"))
    await user.click(screen.getByRole("menuitem", { name: "Configuration" }))

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument()
    expect(screen.getByText("Theme")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument()
  })

  it("calls signOut when Log out is selected from account menu", async () => {
    const user = userEvent.setup()
    mockSignOut.mockResolvedValueOnce(undefined)
    renderAppNav(false)

    await user.click(screen.getByTestId("my-account-button"))
    await user.click(screen.getByRole("menuitem", { name: "Log out" }))

    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })

  it("wraps the expanded brand logo with light multiply and dark screen blend", () => {
    renderAppNav(false)

    const sidebar = screen.getByTestId("app-sidebar")
    const brandLink = within(sidebar).getByRole("link", { name: "Fintu" })
    const iconWrapper = brandLink.querySelector("img")?.parentElement

    expect(iconWrapper?.className).toContain("mix-blend-multiply")
    expect(iconWrapper?.className).toContain("dark:mix-blend-screen")
  })

  it("wraps the collapsed expand-button logo with blend classes and does not invert the overlay icon", () => {
    renderAppNav(true)

    const expandButton = screen.getByTestId("app-sidebar-collapse")
    const iconWrapper = expandButton.querySelector("img")?.parentElement
    const overlayIcon = expandButton.querySelector("svg")

    expect(iconWrapper?.className).toContain("mix-blend-multiply")
    expect(iconWrapper?.className).toContain("dark:mix-blend-screen")
    expect(overlayIcon?.getAttribute("class") ?? overlayIcon?.className).not.toContain("invert")
  })
})
