import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  ProfileSetupFields,
  profileSetupSchema,
  type ProfileSetupForm,
} from "./profile-setup-fields"

vi.mock("@/lib/market-config/market-config", () => ({
  MARKET_CONFIG: {
    defaultCountry: "co",
    defaultBrokerId: "hapi-colombia",
    baseCurrency: "USD",
  },
  SUPPORTED_COUNTRIES: ["co", "mx"],
  countryLabel: (country: string) =>
    country === "co" ? "Colombia" : country === "mx" ? "México" : country.toUpperCase(),
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

vi.mock("@/components/brokers/broker-select", () => ({
  BrokerSelect: ({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) => (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} data-testid="broker-select">
      <option value="hapi-colombia">Hapi</option>
    </select>
  ),
}))

function TestHarness({ step }: { step: "country" | "broker" | "all" }) {
  const form = useForm<ProfileSetupForm>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: { country: "co", brokerPresetId: "hapi-colombia" },
  })

  return (
    <ProfileSetupFields
      step={step}
      setValue={form.setValue}
      errors={form.formState.errors}
      country={form.watch("country")}
      brokerPresetId={form.watch("brokerPresetId")}
    />
  )
}

describe("ProfileSetupFields", () => {
  it("renders country field on country step", () => {
    render(<TestHarness step="country" />)

    expect(screen.getByText("Country")).toBeInTheDocument()
    expect(screen.queryByTestId("broker-select")).not.toBeInTheDocument()
  })

  it("renders broker field on broker step", () => {
    render(<TestHarness step="broker" />)

    expect(screen.getByTestId("broker-select")).toBeInTheDocument()
    expect(screen.queryByText("Country")).not.toBeInTheDocument()
  })

  it("renders both fields on all step", () => {
    render(<TestHarness step="all" />)

    expect(screen.getByText("Country")).toBeInTheDocument()
    expect(screen.getByTestId("broker-select")).toBeInTheDocument()
  })
})
