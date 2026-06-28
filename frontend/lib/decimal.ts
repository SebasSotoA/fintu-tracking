import Decimal from "decimal.js"
import { MARKET_CONFIG, type CashFlowCurrency } from "@/lib/market-config/market-config"

// Configure Decimal.js for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export { Decimal }

const numberFormatCache = new Map<number, Intl.NumberFormat>()

function getNumberFormat(decimals: number): Intl.NumberFormat {
  let formatter = numberFormatCache.get(decimals)
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    numberFormatCache.set(decimals, formatter)
  }
  return formatter
}

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

function currencyDecimals(currency: CashFlowCurrency): number {
  return currency === MARKET_CONFIG.localCurrency
    ? MARKET_CONFIG.localCurrencyDecimals
    : MARKET_CONFIG.baseCurrencyDecimals
}

export function formatCurrency(value: string | number, currency: CashFlowCurrency): string {
  const num = new Decimal(value).toNumber()
  const decimals = currencyDecimals(currency)
  const formatted = getNumberFormat(decimals).format(num)
  return currency === MARKET_CONFIG.baseCurrency ? `$${formatted}` : `$${formatted} ${MARKET_CONFIG.localCurrency}`
}

/** Numeric amount for tables that already have a separate currency column. */
export function formatAmountPlain(value: string | number, currency: CashFlowCurrency): string {
  const num = new Decimal(value).toNumber()
  const decimals = currencyDecimals(currency)
  return getNumberFormat(decimals).format(num)
}
