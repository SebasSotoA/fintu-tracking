import { describe, expect, it } from "vitest"
import { MARKET_CONFIG, isCashFlowCurrency, formatCurrencyPair } from "./market-config"

describe("MARKET_CONFIG", () => {
  it("exports the default Colombia/Hapi market defaults", () => {
    expect(MARKET_CONFIG.defaultCountry).toBe("co")
    expect(MARKET_CONFIG.defaultBrokerId).toBe("hapi-colombia")
    expect(MARKET_CONFIG.baseCurrency).toBe("USD")
    expect(MARKET_CONFIG.localCurrency).toBe("COP")
    expect(MARKET_CONFIG.baseCurrencyLabel).toBe("US Dollar")
    expect(MARKET_CONFIG.localCurrencyLabel).toBe("Colombian Peso")
    expect(MARKET_CONFIG.defaultCurrencyPair).toBe("USD/COP")
    expect(MARKET_CONFIG.inverseCurrencyPair).toBe("COP/USD")
  })

  it("lists supported cash-flow currencies", () => {
    expect(MARKET_CONFIG.cashFlowCurrencies).toContain("USD")
    expect(MARKET_CONFIG.cashFlowCurrencies).toContain("COP")
  })

  it("uses Twelve Data as the default FX source", () => {
    expect(MARKET_CONFIG.defaultFxRateSource).toBe("twelve-data")
  })
})

describe("isCashFlowCurrency", () => {
  it("accepts configured currencies and rejects others", () => {
    expect(isCashFlowCurrency("COP")).toBe(true)
    expect(isCashFlowCurrency("USD")).toBe(true)
    expect(isCashFlowCurrency("EUR")).toBe(false)
  })
})

describe("formatCurrencyPair", () => {
  it("joins from and to with a slash", () => {
    expect(formatCurrencyPair("USD", "COP")).toBe("USD/COP")
    expect(formatCurrencyPair("COP", "USD")).toBe("COP/USD")
  })
})
