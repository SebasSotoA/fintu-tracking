import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SetupModal } from "./setup-modal"
import { useCompleteOnboarding } from "@/hooks/use-onboarding"
import { renderWithLocale } from "@/lib/i18n/test-utils"
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
      <option value="">Choose broker</option>
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

function renderModal(
  profile: Profile = baseProfile,
  onSetupComplete?: (profile: Profile) => void,
  forceOpen?: boolean,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return renderWithLocale(
    <QueryClientProvider client={queryClient}>
      <SetupModal
        initialProfile={profile}
        onSetupComplete={onSetupComplete}
        forceOpen={forceOpen}
      />
    </QueryClientProvider>,
  )
}

async function completeSetup(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByTestId("country-select"), "co")
  await user.click(screen.getByRole("button", { name: "Continue" }))
  await user.selectOptions(screen.getByTestId("broker-select"), "hapi-colombia")
  await user.click(screen.getByRole("button", { name: "Finish setup" }))
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

    expect(screen.getByText("Step 1 of 2")).toBeInTheDocument()
    expect(screen.getByText("Set up your account")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument()
  })

  it("opens for an already onboarded profile when forceOpen is set", () => {
    renderModal({ ...baseProfile, onboarding_completed: true }, undefined, true)

    expect(screen.getByRole("heading", { name: "Set up your account" })).toBeInTheDocument()
  })

  it("does not open for an already onboarded profile without forceOpen", () => {
    renderModal({ ...baseProfile, onboarding_completed: true })

    expect(screen.queryByRole("heading", { name: "Set up your account" })).not.toBeInTheDocument()
  })

  it("keeps the default overlay without intro blur", () => {
    renderModal()

    const overlay = document.querySelector("[data-slot=dialog-overlay]")
    expect(overlay).toHaveClass("bg-black/50")
    expect(overlay).not.toHaveClass("backdrop-blur-md")
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
    await user.click(screen.getByRole("button", { name: "Continue" }))

    expect(screen.getByText("Step 2 of 2")).toBeInTheDocument()

    await user.selectOptions(screen.getByTestId("broker-select"), "hapi-colombia")
    await user.click(screen.getByRole("button", { name: "Finish setup" }))

    expect(mockComplete).toHaveBeenCalledWith({
      country: "co",
      broker_preset_id: "hapi-colombia",
    })
  })

  it("shows back button on step 2", async () => {
    const user = userEvent.setup()
    renderModal()

    await user.selectOptions(screen.getByTestId("country-select"), "co")
    await user.click(screen.getByRole("button", { name: "Continue" }))

    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument()
  })

  it("does not skip the broker step when Continue is clicked", async () => {
    const user = userEvent.setup()
    renderModal()

    await user.click(screen.getByRole("button", { name: "Continue" }))

    expect(screen.getByText("Step 2 of 2")).toBeInTheDocument()
    expect(screen.getByTestId("broker-select")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Finish setup" })).toBeInTheDocument()
    expect(mockComplete).not.toHaveBeenCalled()
  })

  it("preselects Hapi on the broker step and does not show a broker error", async () => {
    const user = userEvent.setup()
    mockComplete.mockResolvedValueOnce({
      ...baseProfile,
      onboarding_completed: true,
      subscription_status: "active",
    })

    renderModal()

    await user.click(screen.getByRole("button", { name: "Continue" }))

    const brokerSelect = screen.getByTestId("broker-select") as HTMLSelectElement
    expect(brokerSelect.value).toBe("hapi-colombia")
    expect(screen.queryByText("Select a broker")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Finish setup" }))

    expect(mockComplete).toHaveBeenCalledWith({
      country: "co",
      broker_preset_id: "hapi-colombia",
    })
  })

  it("keeps Continue, Back, and Finish outside the scroll body", async () => {
    const user = userEvent.setup()
    renderModal()

    const continueButton = screen.getByRole("button", { name: "Continue" })
    expect(continueButton).toBeInTheDocument()
    expect(screen.getByTestId("dialog-scroll-body")).not.toContainElement(continueButton)

    await user.selectOptions(screen.getByTestId("country-select"), "co")
    await user.click(continueButton)

    const scrollBody = screen.getByTestId("dialog-scroll-body")
    const backButton = screen.getByRole("button", { name: "Back" })
    const finishButton = screen.getByRole("button", { name: "Finish setup" })

    expect(backButton).toBeInTheDocument()
    expect(finishButton).toBeInTheDocument()
    expect(scrollBody).not.toContainElement(backButton)
    expect(scrollBody).not.toContainElement(finishButton)
  })

  it("keeps 1.5rem footer padding and does not use pb-safe", () => {
    renderModal()

    const footer = document.querySelector("[data-slot=dialog-footer]")
    expect(footer).toHaveClass("pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]")
    expect(footer).not.toHaveClass("pb-safe")
  })

  it("redirects to subscription when onboarding completes without active subscription", async () => {
    const user = userEvent.setup()
    mockComplete.mockResolvedValueOnce({
      ...baseProfile,
      onboarding_completed: true,
      subscription_status: "canceled",
    })

    renderModal()
    await completeSetup(user)

    expect(mockPush).toHaveBeenCalledWith("/subscription")
  })

  it("calls onSetupComplete with the updated profile after a successful submit", async () => {
    const user = userEvent.setup()
    const onSetupComplete = vi.fn()
    const updatedProfile: Profile = {
      ...baseProfile,
      onboarding_completed: true,
      subscription_status: "active",
    }
    mockComplete.mockResolvedValueOnce(updatedProfile)

    renderModal(baseProfile, onSetupComplete)
    await completeSetup(user)

    await waitFor(() => {
      expect(onSetupComplete).toHaveBeenCalledWith(updatedProfile)
    })
    expect(mockRefresh).toHaveBeenCalled()
  })
})
