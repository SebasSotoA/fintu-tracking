import { Decimal } from "@/lib/decimal"

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

export function computeBrokerFeeUSD(netUsd: string, fee: BrokerFee): string | null {
  const net = safeDecimal(netUsd)
  if (!net || net.lte(0)) return null

  if (fee.type === "none") return "0.00"

  const feeValue = safeDecimal(fee.value)
  if (!feeValue) return null

  if (fee.type === "flat") {
    return feeValue.toFixed(2)
  }

  if (fee.type === "percentage") {
    return net.mul(feeValue).toFixed(2)
  }

  return null
}

/** Computes the preset USD fee for a cash-flow type, or null when not applicable. */
export function computeCashFlowBrokerFeeUSD(
  type: "deposit" | "withdrawal" | string,
  brokerId: string,
  netUsd: string,
): string | null {
  if (type !== "deposit" && type !== "withdrawal") return null
  const preset = getBrokerPreset(brokerId)
  if (!preset) return null
  const fee = type === "withdrawal" ? preset.withdrawalFee : preset.depositFee
  return computeBrokerFeeUSD(netUsd, fee)
}

function safeDecimal(value: string): Decimal | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    const parsed = new Decimal(trimmed)
    return parsed.isFinite() ? parsed : null
  } catch {
    return null
  }
}
