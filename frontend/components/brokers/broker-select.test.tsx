import { describe, it, expect, vi, beforeAll } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrokerSelect } from "./broker-select"

vi.mock("@/lib/market-config/market-config", () => ({
  MARKET_CONFIG: {
    defaultCountry: "co",
    defaultBrokerId: "hapi-colombia",
  },
}))

vi.mock("@/lib/api/brokers", () => ({
  listBrokers: vi.fn(() =>
    Promise.resolve({
      brokers: [
        {
          id: "uuid-hapi",
          preset_id: "hapi-colombia",
          name: "Hapi",
          user_id: "u1",
          country: "co",
          base_currency: "USD",
          local_currency: "COP",
          deposit_fee_type: "percentage",
          deposit_fee_value: "0.009",
          withdrawal_fee_type: "none",
          withdrawal_fee_value: "0",
          created_at: "",
          updated_at: "",
        },
      ],
      presets: [],
    }),
  ),
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
  SelectTrigger: ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <span data-testid="select-trigger" className={className}>
      {children}
    </span>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <option value="">{placeholder}</option>,
}))

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = vi.fn()
  HTMLElement.prototype.setPointerCapture = vi.fn()
  HTMLElement.prototype.releasePointerCapture = vi.fn()
})

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe("BrokerSelect", () => {
  it("defaults to presets for the configured default country", () => {
    renderWithQuery(
      <BrokerSelect
        id="broker"
        value=""
        onChange={() => {}}
      />,
    )

    expect(screen.getByText("Broker")).toBeInTheDocument()

    const select = screen.getByTestId("select")
    expect(select.children).toHaveLength(6)
    expect(screen.getByText("Hapi")).toBeInTheDocument()
  })

  it("filters presets by country prop", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    renderWithQuery(
      <BrokerSelect
        id="broker"
        value=""
        onChange={onChange}
        country="mx"
      />,
    )

    const select = screen.getByTestId("select")
    await user.selectOptions(select, "gbm-mexico")

    expect(onChange).toHaveBeenCalledWith("gbm-mexico")
  })

  it("SelectTrigger has w-full class", () => {
    renderWithQuery(
      <BrokerSelect
        id="broker"
        value=""
        onChange={() => {}}
      />,
    )

    expect(screen.getByTestId("select-trigger")).toHaveClass("w-full")
  })

  it("maps a broker UUID value to its preset_id so the trigger shows the correct name", async () => {
    renderWithQuery(
      <BrokerSelect
        id="broker"
        value="uuid-hapi"
        onChange={() => {}}
      />,
    )

    await waitFor(() => {
      const select = screen.getByTestId("select") as HTMLSelectElement
      expect(select.value).toBe("hapi-colombia")
    })
  })

  it("preset_id value passthrough still works (no UUID in brokers list)", () => {
    renderWithQuery(
      <BrokerSelect
        id="broker"
        value="hapi-colombia"
        onChange={() => {}}
      />,
    )

    const select = screen.getByTestId("select") as HTMLSelectElement
    expect(select.value).toBe("hapi-colombia")
  })
})
