import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SetupModal } from "./setup-modal"
import { useCompleteOnboarding } from "@/hooks/use-onboarding"
import type { Profile } from "@/lib/api/me"

vi.mock("@/hooks/use-onboarding")
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
      <option value="">Elige broker</option>
      <option value="hapi-colombia">Hapi</option>
    </select>
  ),
}))

const { mockPush, mockRefresh } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockRefresh: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

const mockComplete = vi.fn()
const mockUseCompleteOnboarding = {
  mutateAsync: mockComplete,
  isPending: false,
} as unknown as ReturnType<typeof useCompleteOnboarding>

const baseProfile: Profile = {
  id: "profile-1",
  user_id: "user-1",
  country: "",
  broker_preset_id: null,
  onboarding_completed: false,
  onboarding_step: "country",
  created_at: "",
  updated_at: "",
}

function renderModal(profile: Profile = baseProfile) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <SetupModal initialProfile={profile} />
    </QueryClientProvider>,
  )
}

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = vi.fn()
  HTMLElement.prototype.setPointerCapture = vi.fn()
  HTMLElement.prototype.releasePointerCapture = vi.fn()
})

describe("SetupModal", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockPush.mockReset()
    mockRefresh.mockReset()
    vi.mocked(useCompleteOnboarding).mockReturnValue(mockUseCompleteOnboarding)
  })

  it("starts on step 1 with progress bar", () => {
    renderModal()

    expect(screen.getByText("Paso 1 de 2")).toBeInTheDocument()
    expect(screen.getByText("Configura tu cuenta")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Continuar" })).toBeInTheDocument()
  })

  it("navigates to step 2 and submits onboarding", async () => {
    const user = userEvent.setup()
    mockComplete.mockResolvedValueOnce({
      ...baseProfile,
      onboarding_completed: true,
      subscription_status: "active",
    })

    renderModal()

    await user.selectOptions(screen.getByTestId("country-select"), "co")
    await user.click(screen.getByRole("button", { name: "Continuar" }))

    expect(screen.getByText("Paso 2 de 2")).toBeInTheDocument()

    await user.selectOptions(screen.getByTestId("broker-select"), "hapi-colombia")
    await user.click(screen.getByRole("button", { name: "Finalizar configuración" }))

    expect(mockComplete).toHaveBeenCalledWith({
      country: "co",
      broker_preset_id: "hapi-colombia",
    })
  })

  it("shows back button on step 2", async () => {
    const user = userEvent.setup()
    renderModal()

    await user.selectOptions(screen.getByTestId("country-select"), "co")
    await user.click(screen.getByRole("button", { name: "Continuar" }))

    expect(screen.getByRole("button", { name: "Atrás" })).toBeInTheDocument()
  })

  it("redirects to subscription when onboarding completes without active subscription", async () => {
    const user = userEvent.setup()
    mockComplete.mockResolvedValueOnce({
      ...baseProfile,
      onboarding_completed: true,
      subscription_status: "canceled",
    })

    renderModal()

    await user.selectOptions(screen.getByTestId("country-select"), "co")
    await user.click(screen.getByRole("button", { name: "Continuar" }))
    await user.selectOptions(screen.getByTestId("broker-select"), "hapi-colombia")
    await user.click(screen.getByRole("button", { name: "Finalizar configuración" }))

    expect(mockPush).toHaveBeenCalledWith("/subscription")
  })
})
