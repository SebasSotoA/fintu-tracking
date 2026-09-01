import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AccountMenu } from "./account-menu"
import { renderWithLocale } from "@/lib/i18n/test-utils"
import type { Profile } from "@/lib/api/me"

const mockSignOut = vi.fn()

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "dark",
    setTheme: vi.fn(),
  }),
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

function renderAccountMenu(
  props: Partial<React.ComponentProps<typeof AccountMenu>> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return renderWithLocale(
    <QueryClientProvider client={queryClient}>
      <AccountMenu
        profile={baseProfile}
        collapsed={false}
        variant="sidebar"
        {...props}
      />
    </QueryClientProvider>,
  )
}

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = vi.fn()
  HTMLElement.prototype.setPointerCapture = vi.fn()
  HTMLElement.prototype.releasePointerCapture = vi.fn()
})

describe("AccountMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows My account trigger with Portfolio subtitle in expanded sidebar", () => {
    renderAccountMenu({ variant: "sidebar", collapsed: false })

    expect(screen.getByTestId("my-account-button")).toHaveTextContent("My account")
    expect(screen.getByTestId("my-account-button")).toHaveTextContent("Portfolio")
    expect(screen.getByText("My account").className).toContain("text-foreground")
  })

  it("gives the expanded sidebar trigger roomy hover padding", () => {
    renderAccountMenu({ variant: "sidebar", collapsed: false })

    const trigger = screen.getByTestId("my-account-button")
    expect(trigger.className).toContain("min-h-11")
    expect(trigger.className).toContain("px-2")
    expect(trigger.className).toContain("py-2")
    expect(trigger.className.split(/\s+/)).not.toContain("h-9")
  })

  it("shows icon-only trigger when sidebar is collapsed", () => {
    renderAccountMenu({ variant: "sidebar", collapsed: true })

    const trigger = screen.getByTestId("my-account-button")
    expect(trigger).toHaveAttribute("aria-label", "My account")
    const labelContainer = within(trigger).getByText("My account").parentElement
    expect(labelContainer).toHaveAttribute("aria-hidden", "true")
  })

  it("keeps the collapsed sidebar trigger compact without extra padding", () => {
    renderAccountMenu({ variant: "sidebar", collapsed: true })

    const trigger = screen.getByTestId("my-account-button")
    expect(trigger.className).toContain("h-9")
    expect(trigger.className).not.toContain("px-2")
    expect(trigger.className).not.toContain("py-2")
  })

  it("opens menu with Configuration and Log out items", async () => {
    const user = userEvent.setup()
    renderAccountMenu()

    await user.click(screen.getByTestId("my-account-button"))

    expect(screen.getByRole("menuitem", { name: "Configuration" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Log out" })).toBeInTheDocument()
  })

  it("opens profile config dialog when Configuration is selected", async () => {
    const user = userEvent.setup()
    renderAccountMenu()

    await user.click(screen.getByTestId("my-account-button"))
    await user.click(screen.getByRole("menuitem", { name: "Configuration" }))

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument()
    expect(screen.getByText("Theme")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument()
  })

  it("calls signOut when Log out is selected", async () => {
    const user = userEvent.setup()
    mockSignOut.mockResolvedValueOnce(undefined)
    renderAccountMenu()

    await user.click(screen.getByTestId("my-account-button"))
    await user.click(screen.getByRole("menuitem", { name: "Log out" }))

    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })

  it("renders mobile variant with Account label", () => {
    renderAccountMenu({ variant: "mobile" })

    expect(screen.getByTestId("my-account-button-mobile")).toHaveTextContent("Account")
  })

  it("opens mobile menu with Configuration and Log out items", async () => {
    const user = userEvent.setup()
    renderAccountMenu({ variant: "mobile" })

    await user.click(screen.getByTestId("my-account-button-mobile"))

    expect(screen.getByRole("menuitem", { name: "Configuration" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Log out" })).toBeInTheDocument()
  })
})
