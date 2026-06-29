import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { OnboardingWizard } from "./onboarding-wizard"
import { useCompleteOnboarding } from "@/hooks/use-onboarding"

vi.mock("@/hooks/use-onboarding")
vi.mock("@/lib/market-config/market-config", () => ({
  MARKET_CONFIG: {
    defaultCountry: "co",
    defaultBrokerId: "hapi-colombia",
    baseCurrency: "USD",
  },
  SUPPORTED_COUNTRIES: ["co", "mx"],
  countryLabel: (country: string) => (country === "co" ? "Colombia" : country === "mx" ? "Mexico" : country.toUpperCase()),
}))
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children, id }: { value?: string; onValueChange?: (value: string) => void; children?: React.ReactNode; id?: string }) => (
    <select id={id} value={value} onChange={(e) => onValueChange?.(e.target.value)} data-testid="select">
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

const mockComplete = vi.fn()
const mockUseCompleteOnboarding = {
  mutateAsync: mockComplete,
  isPending: false,
} as unknown as ReturnType<typeof useCompleteOnboarding>

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = vi.fn()
  HTMLElement.prototype.setPointerCapture = vi.fn()
  HTMLElement.prototype.releasePointerCapture = vi.fn()
})

describe("OnboardingWizard", () => {
  const baseProfile = {
    id: "profile-1",
    user_id: "user-1",
    country: "",
    broker_preset_id: null,
    onboarding_completed: false,
    onboarding_step: "welcome",
    created_at: "",
    updated_at: "",
  }

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(useCompleteOnboarding).mockReturnValue(mockUseCompleteOnboarding)
  })

  it("starts on welcome step", () => {
    render(<OnboardingWizard initialProfile={baseProfile} />)

    expect(screen.getByText("Welcome to Fintu")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Get started" })).toBeInTheDocument()
  })

  it("navigates through country and broker selection and submits", async () => {
    const user = userEvent.setup()
    mockComplete.mockResolvedValueOnce({ ...baseProfile, onboarding_completed: true })

    render(<OnboardingWizard initialProfile={baseProfile} />)

    await user.click(screen.getByRole("button", { name: "Get started" }))
    expect(screen.getByText("Select your country")).toBeInTheDocument()

    const countrySelect = screen.getByTestId("select")
    await user.selectOptions(countrySelect, "co")

    await user.click(screen.getByRole("button", { name: "Continue" }))
    expect(screen.getByText("Select your broker")).toBeInTheDocument()

    const brokerSelect = screen.getByTestId("select")
    await user.selectOptions(brokerSelect, "hapi-colombia")

    await user.click(screen.getByRole("button", { name: "Go to dashboard" }))

    expect(mockComplete).toHaveBeenCalledWith({
      country: "co",
      broker_preset_id: "hapi-colombia",
    })
  })

})
