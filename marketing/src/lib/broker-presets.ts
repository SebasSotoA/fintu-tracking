export interface BrokerFee {
  type: "percentage" | "flat" | "none"
  value: string
}

export interface BrokerPreset {
  id: string
  name: string
  country: string
  baseCurrency: string
  localCurrency: string
  depositFee: BrokerFee
  withdrawalFee: BrokerFee
}

export const BROKER_PRESETS: BrokerPreset[] = [
  {
    id: "hapi-colombia",
    name: "Hapi",
    country: "co",
    baseCurrency: "USD",
    localCurrency: "COP",
    depositFee: { type: "percentage", value: "0.009" },
    withdrawalFee: { type: "none", value: "0" },
  },
  {
    id: "trii-colombia",
    name: "Trii",
    country: "co",
    baseCurrency: "USD",
    localCurrency: "COP",
    depositFee: { type: "percentage", value: "0" },
    withdrawalFee: { type: "none", value: "0" },
  },
  {
    id: "gbm-mexico",
    name: "GBM",
    country: "mx",
    baseCurrency: "USD",
    localCurrency: "MXN",
    depositFee: { type: "none", value: "0" },
    withdrawalFee: { type: "none", value: "0" },
  },
  {
    id: "xtb",
    name: "XTB",
    country: "co",
    baseCurrency: "USD",
    localCurrency: "COP",
    depositFee: { type: "none", value: "0" },
    withdrawalFee: { type: "none", value: "0" },
  },
  {
    id: "etoro",
    name: "eToro",
    country: "co",
    baseCurrency: "USD",
    localCurrency: "COP",
    depositFee: { type: "none", value: "0" },
    withdrawalFee: { type: "flat", value: "5" },
  },
  {
    id: "manual",
    name: "Other / Manual",
    country: "co",
    baseCurrency: "USD",
    localCurrency: "COP",
    depositFee: { type: "none", value: "0" },
    withdrawalFee: { type: "none", value: "0" },
  },
]

export function getBrokerPreset(id: string): BrokerPreset | undefined {
  return BROKER_PRESETS.find((preset) => preset.id === id)
}

export function listBrokerPresetsForCountry(country: string): BrokerPreset[] {
  return BROKER_PRESETS.filter((preset) => preset.country === country)
}

export function listAllBrokerPresets(): BrokerPreset[] {
  return BROKER_PRESETS
}