import { Decimal } from "@/lib/decimal"

export interface HapiDepositBreakdownInput {
  copAmount: string
  fxRate: string
  feeUsd: string
}

export interface HapiDepositBreakdown {
  grossUsd: string
  feeUsd: string
  netUsdCredited: string
}

export interface HapiCopFromNetInput {
  netUsdTarget: string
  feeUsd: string
  fxRate: string
}

export function computeHapiDepositBreakdown(input: HapiDepositBreakdownInput): HapiDepositBreakdown {
  const copAmount = safeDecimal(input.copAmount)
  const fxRate = safeDecimal(input.fxRate)
  const feeUsd = nonNegativeDecimal(input.feeUsd)

  if (!copAmount || !fxRate || fxRate.lte(0)) {
    return {
      grossUsd: "0.00",
      feeUsd: feeUsd?.toFixed(2) ?? "0.00",
      netUsdCredited: "0.00",
    }
  }

  const grossUsd = copAmount.div(fxRate)
  const netUsdCredited = grossUsd.sub(feeUsd ?? new Decimal(0))

  return {
    grossUsd: grossUsd.toFixed(2),
    feeUsd: (feeUsd ?? new Decimal(0)).toFixed(2),
    netUsdCredited: netUsdCredited.toFixed(2),
  }
}

export function computeCopToWireFromNetTarget(input: HapiCopFromNetInput): string {
  const netUsdTarget = safeDecimal(input.netUsdTarget)
  const feeUsd = nonNegativeDecimal(input.feeUsd) ?? new Decimal(0)
  const fxRate = safeDecimal(input.fxRate)

  if (!netUsdTarget || !fxRate || fxRate.lte(0)) return "0"
  if (netUsdTarget.lte(0)) return "0"

  return netUsdTarget.add(feeUsd).mul(fxRate).toFixed(0)
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

function nonNegativeDecimal(value: string): Decimal | null {
  const parsed = safeDecimal(value)
  if (!parsed || parsed.lt(0)) return null
  return parsed
}
