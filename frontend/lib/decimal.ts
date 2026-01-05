import Decimal from "decimal.js"

// Configure Decimal.js for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export { Decimal }

// Utility functions for safe decimal operations
export function add(...values: (string | number)[]): string {
  return values.reduce((acc, val) => acc.add(val), new Decimal(0)).toString()
}

export function subtract(a: string | number, b: string | number): string {
  return new Decimal(a).sub(b).toString()
}

export function multiply(...values: (string | number)[]): string {
  return values.reduce((acc, val) => acc.mul(val), new Decimal(1)).toString()
}

export function divide(a: string | number, b: string | number): string {
  return new Decimal(a).div(b).toString()
}

export function format(value: string | number, decimals = 2): string {
  return new Decimal(value).toFixed(decimals)
}

export function formatCurrency(value: string | number, currency: "USD" | "COP"): string {
  const formatted = format(value, currency === "COP" ? 0 : 2)
  if (currency === "USD") {
    return `$${formatted}`
  }
  return `$${formatted} COP`
}
