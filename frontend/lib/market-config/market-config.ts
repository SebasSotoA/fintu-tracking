// Central market configuration for the current default market (Colombia / Hapi).
// Import these values instead of hard-coding currency codes, pairs, or provider
// names so new countries and brokers can be added without touching every file.

export const MARKET_CONFIG = {
  // Country / broker defaults for onboarding and presets.
  defaultCountry: "co",
  defaultBrokerId: "hapi-colombia",

  // Currencies.
  baseCurrency: "USD",
  localCurrency: "COP",
  baseCurrencyLabel: "US Dollar",
  localCurrencyLabel: "Colombian Peso",
  defaultCurrencyPair: "USD/COP",
  inverseCurrencyPair: "COP/USD",

  // Cash-flow currencies allowed in filters and forms.
  cashFlowCurrencies: ["USD", "COP"] as const,

  // Market data / FX provider defaults.
  priceProvider: "twelve-data",
  defaultMarketCurrency: "USD",
  defaultFxRateSource: "twelve-data",
  defaultFxRateDays: 30,
  maxFxRateDays: 90,

  // Display defaults.
  baseCurrencyDecimals: 2,
  localCurrencyDecimals: 0,
} as const

export type CashFlowCurrency = (typeof MARKET_CONFIG.cashFlowCurrencies)[number]

export function isCashFlowCurrency(value: string): value is CashFlowCurrency {
  return MARKET_CONFIG.cashFlowCurrencies.includes(value as CashFlowCurrency)
}

export function formatCurrencyPair(from: string, to: string): string {
  return `${from}/${to}`
}
