import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ProfileConfigDialog } from "./profile-config-dialog"
import { useUpdateProfile } from "@/hooks/use-update-profile"
import type { Profile } from "@/lib/api/me"

const { mockSetTheme } = vi.hoisted(() => ({
  mockSetTheme: vi.fn(),
}))

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "dark",
    setTheme: mockSetTheme,
  }),
}))

vi.mock("@/hooks/use-update-profile")
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

vi.mock("@/components/ui/select", async () => {
  const React = await import("react")

  function triggerId(children: React.ReactNode): string | undefined {
    const nodes = React.Children.toArray(children)
    for (const child of nodes) {
      if (React.isValidElement(child) && typeof (child.props as { id?: string }).id === "string") {
        return (child.props as { id: string }).id
      }
    }
    return undefined
  }

  function selectTestId(id: string | undefined): string {
    if (id === "theme") return "theme-select"
    if (id === "country") return "country-select"
    return "select"
  }

  return {
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value?: string
      onValueChange?: (value: string) => void
      children?: React.ReactNode
    }) => {
      const id = triggerId(children)
      return React.createElement(
        "select",
        {
          id,
          value,
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onValueChange?.(e.target.value),
          "data-testid": selectTestId(id),
        },
        children,
      )
    },
    SelectContent: ({ children }: { children?: React.ReactNode }) => children,
    SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) =>
      React.createElement("option", { value }, children),
    SelectTrigger: ({ children }: { children?: React.ReactNode; id?: string }) => children,
    SelectValue: ({ placeholder }: { placeholder?: string }) =>
      React.createElement("option", { value: "" }, placeholder),
  }
})

vi.mock("@/components/brokers/broker-select", () => ({
  BrokerSelect: ({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) => (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} data-testid="broker-select">
      <option value="hapi-colombia">Hapi</option>
    </select>
  ),
}))

const mockMutateAsync = vi.fn()
const mockUseUpdateProfile = {
  mutateAsync: mockMutateAsync,
  isPending: false,
} as unknown as ReturnType<typeof useUpdateProfile>

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

function renderDialog(open = true, onOpenChange = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ProfileConfigDialog profile={baseProfile} open={open} onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  )
}

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = vi.fn()
  HTMLElement.prototype.setPointerCapture = vi.fn()
  HTMLElement.prototype.releasePointerCapture = vi.fn()
})

describe("ProfileConfigDialog", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(useUpdateProfile).mockReturnValue(mockUseUpdateProfile)
  })

  it("renders Settings with a Theme row and no save until dirty", () => {
    renderDialog()

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument()
    expect(screen.getByText("Theme")).toBeInTheDocument()
    expect(screen.getByTestId("theme-select")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument()

    const dialog = screen.getByRole("dialog")
    expect(dialog).toHaveClass("p-0")
    expect(dialog).toHaveClass("md:pb-0")
    expect(dialog.className).toContain("pb-0!")
  })

  it("shows Save after changing country and submits the profile update", async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockResolvedValueOnce(baseProfile)

    renderDialog()

    await user.click(screen.getByRole("button", { name: "Account" }))
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument()

    await user.selectOptions(screen.getByTestId("country-select"), "mx")
    await user.selectOptions(screen.getByTestId("broker-select"), "hapi-colombia")
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Save changes" }))

    expect(mockMutateAsync).toHaveBeenCalledWith({
      country: "mx",
      broker_preset_id: "hapi-colombia",
    })
  })

  it("calls setTheme immediately when picking Light, Dark, or System", async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.selectOptions(screen.getByTestId("theme-select"), "light")
    expect(mockSetTheme).toHaveBeenCalledWith("light")

    await user.selectOptions(screen.getByTestId("theme-select"), "dark")
    expect(mockSetTheme).toHaveBeenCalledWith("dark")

    await user.selectOptions(screen.getByTestId("theme-select"), "system")
    expect(mockSetTheme).toHaveBeenCalledWith("system")

    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument()
  })

  it("switches to Account and shows Broker when searching broker", async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByRole("searchbox", { name: "Search settings" }), "broker")

    expect(screen.getByText("Broker")).toBeVisible()
    expect(screen.queryByText("Theme")).not.toBeInTheDocument()
  })

  it("shows Theme when searching theme", async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.type(screen.getByRole("searchbox", { name: "Search settings" }), "theme")

    expect(screen.getByText("Theme")).toBeVisible()
    expect(screen.queryByText("Broker")).not.toBeVisible()
  })

  it("resets the form on cancel and keeps the dialog open", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    renderDialog(true, onOpenChange)

    await user.click(screen.getByRole("button", { name: "Account" }))
    await user.selectOptions(screen.getByTestId("country-select"), "mx")
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Cancel" }))

    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it("keeps the Account form mounted but out of the a11y tree on General", () => {
    renderDialog()

    const form = document.getElementById("profile-config-form")
    expect(form).toBeInTheDocument()
    expect(form).toHaveAttribute("hidden")
    expect(form).toHaveAttribute("inert")
    expect(form).toHaveAttribute("aria-hidden", "true")
    expect(screen.queryByRole("combobox", { name: "Country" })).not.toBeInTheDocument()
    expect(screen.queryByRole("combobox", { name: "Broker" })).not.toBeInTheDocument()
  })

  it("hides the dirty footer when switching back to General", async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole("button", { name: "Account" }))
    await user.selectOptions(screen.getByTestId("country-select"), "mx")
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "General" }))
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument()
  })
})
