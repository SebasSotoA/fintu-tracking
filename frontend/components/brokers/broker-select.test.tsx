import { describe, it, expect, vi, beforeAll } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { BrokerSelect } from "./broker-select"

vi.mock("@/lib/market-config/market-config", () => ({
  MARKET_CONFIG: {
    defaultCountry: "co",
    defaultBrokerId: "hapi-colombia",
  },
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

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = vi.fn()
  HTMLElement.prototype.setPointerCapture = vi.fn()
  HTMLElement.prototype.releasePointerCapture = vi.fn()
})

describe("BrokerSelect", () => {
  it("defaults to presets for the configured default country", () => {
    render(
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

    render(
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
})
