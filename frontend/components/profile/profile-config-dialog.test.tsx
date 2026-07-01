import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ProfileConfigDialog } from "./profile-config-dialog"
import { useUpdateProfile } from "@/hooks/use-update-profile"
import type { Profile } from "@/lib/api/me"

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
    <select id={id} value={value} onChange={(e) => onValueChange?.(e.target.value)} data-testid="country-select">
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

  it("renders profile fields and save button", () => {
    renderDialog()

    expect(screen.getByText("Mi cuenta")).toBeInTheDocument()
    expect(screen.getByText("País")).toBeInTheDocument()
    expect(screen.getByTestId("broker-select")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument()
  })

  it("submits profile update on save", async () => {
    const user = userEvent.setup()
    mockMutateAsync.mockResolvedValueOnce(baseProfile)

    renderDialog()

    await user.selectOptions(screen.getByTestId("country-select"), "mx")
    await user.selectOptions(screen.getByTestId("broker-select"), "hapi-colombia")
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }))

    expect(mockMutateAsync).toHaveBeenCalledWith({
      country: "mx",
      broker_preset_id: "hapi-colombia",
    })
  })
})
