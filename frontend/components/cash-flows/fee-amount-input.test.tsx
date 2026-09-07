import { describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderWithLocale } from "@/lib/i18n/test-utils"
import { FeeAmountInput } from "./fee-amount-input"

function renderFeeAmountInput(
  overrides: Partial<Parameters<typeof FeeAmountInput>[0]> = {},
) {
  return renderWithLocale(
    <FeeAmountInput
      id="fee-amount"
      label="Deposit fee USD"
      value=""
      onChange={vi.fn()}
      feeUnit="usd"
      onFeeUnitChange={vi.fn()}
      {...overrides}
    />,
  )
}

describe("FeeAmountInput", () => {
  it("puts the unit toggle inside the same bordered wrapper as the number input", () => {
    renderFeeAmountInput()

    const input = screen.getByRole("spinbutton", { name: /deposit fee usd/i })
    const usdToggle = screen.getByRole("radio", { name: /fee in dollars/i })
    const percentToggle = screen.getByRole("radio", { name: /fee as percent/i })
    const wrapper = input.closest(".border")

    expect(wrapper).toBeTruthy()
    expect(wrapper!.contains(input)).toBe(true)
    expect(wrapper!.contains(usdToggle)).toBe(true)
    expect(wrapper!.contains(percentToggle)).toBe(true)
    expect(wrapper).toHaveClass("h-11")
    expect(wrapper).toHaveClass("md:h-9")
    expect(wrapper).not.toHaveClass("pr-1")
    expect(wrapper).toHaveClass("overflow-hidden")
    expect(wrapper).not.toHaveClass("gap-2")
  })

  it("stretches the unit radios flush to the wrapper right edge", () => {
    renderFeeAmountInput()

    const group = screen.getByRole("radiogroup", { name: /fee unit/i })
    const usdToggle = screen.getByRole("radio", { name: /fee in dollars/i })
    const percentToggle = screen.getByRole("radio", { name: /fee as percent/i })

    expect(group).toHaveClass("h-full")
    expect(group).toHaveClass("self-stretch")
    expect(group).toHaveClass("rounded-none")
    expect(usdToggle).toHaveClass("h-full")
    expect(usdToggle).toHaveClass("border-y-0")
    expect(usdToggle).toHaveClass("first:rounded-none")
    expect(usdToggle).toHaveClass("focus-visible:ring-0")
    expect(percentToggle).toHaveClass("h-full")
    expect(percentToggle).toHaveClass("border-y-0")
    expect(percentToggle).toHaveClass("last:rounded-none")
    expect(percentToggle).not.toHaveClass("last:rounded-r-md")
    expect(percentToggle).not.toHaveClass("rounded-r-md")
    expect(percentToggle).toHaveClass("border-r-0")
    expect(percentToggle).toHaveClass("focus-visible:ring-0")
  })

  it("renders a borderless mono number input with hidden spin buttons", () => {
    renderFeeAmountInput()

    const input = screen.getByRole("spinbutton", { name: /deposit fee usd/i })
    expect(input).toHaveClass("border-0")
    expect(input).toHaveClass("rounded-none")
    expect(input).toHaveClass("flex-1")
    expect(input).toHaveClass("font-mono")
    expect(input).toHaveClass("[appearance:textfield]")
    expect(input).toHaveClass("[&::-webkit-inner-spin-button]:appearance-none")
    expect(input).toHaveClass("[&::-webkit-outer-spin-button]:appearance-none")
  })

  it("keeps radiogroup accessibility names for the fee unit toggle", () => {
    renderFeeAmountInput()

    expect(screen.getByRole("radiogroup", { name: /fee unit/i })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: /fee in dollars/i })).toHaveAttribute("data-state", "on")
    expect(screen.getByRole("radio", { name: /fee as percent/i })).toHaveAttribute("data-state", "off")
  })

  it("shows the percent USD equivalent hint below the field", () => {
    renderFeeAmountInput({
      feeUnit: "percent",
      label: "Deposit fee %",
      equivalentHint: "≈ $0.90",
    })

    const input = screen.getByRole("spinbutton", { name: /deposit fee %/i })
    const wrapper = input.closest(".border") as HTMLElement
    const hint = screen.getByText("≈ $0.90")

    expect(hint).toBeInTheDocument()
    expect(hint).toHaveAttribute("id", "fee-amount-equivalent")
    expect(hint).toHaveAttribute("role", "status")
    expect(input).toHaveAttribute("aria-describedby", "fee-amount-equivalent")
    expect(wrapper.contains(hint)).toBe(false)
  })

  it("calls onChange and onFeeUnitChange from the in-field controls", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onFeeUnitChange = vi.fn()
    renderFeeAmountInput({ onChange, onFeeUnitChange })

    await user.type(screen.getByRole("spinbutton", { name: /deposit fee usd/i }), "1.99")
    expect(onChange).toHaveBeenCalled()

    await user.click(screen.getByRole("radio", { name: /fee as percent/i }))
    expect(onFeeUnitChange).toHaveBeenCalledWith("percent")
  })
})
