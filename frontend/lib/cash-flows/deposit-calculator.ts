import { Decimal } from "@/lib/decimal"

export interface DepositBreakdownInput {
  netUsd: string
  feeUsd: string
  fxRate: string
}

export interface DepositBreakdown {
  netUsd: string
  feeUsd: string
  subtotalUsd: string
  localAmount: string
}

export function computeDepositBreakdown(input: DepositBreakdownInput): DepositBreakdown {
  const netUsd = safeDecimal(input.netUsd)
  const fxRate = safeDecimal(input.fxRate)
  const feeUsd = nonNegativeDecimal(input.feeUsd) ?? new Decimal(0)

  if (!netUsd || !fxRate || netUsd.lte(0) || fxRate.lte(0)) {
    return {
      netUsd: "0.00",
      feeUsd: feeUsd.toFixed(2),
      subtotalUsd: "0.00",
      localAmount: "0.00",
    }
  }

  const subtotalUsd = netUsd.add(feeUsd)
  const localAmount = subtotalUsd.mul(fxRate)

  return {
    netUsd: netUsd.toFixed(2),
    feeUsd: feeUsd.toFixed(2),
    subtotalUsd: subtotalUsd.toFixed(2),
    localAmount: localAmount.toFixed(2),
  }
}

export function computeCopFromNetUsd(input: DepositBreakdownInput): string {
  const netUsd = safeDecimal(input.netUsd)
  const feeUsd = nonNegativeDecimal(input.feeUsd) ?? new Decimal(0)
  const fxRate = safeDecimal(input.fxRate)

  if (!netUsd || !fxRate || netUsd.lte(0) || fxRate.lte(0)) return "0.00"

  return netUsd.add(feeUsd).mul(fxRate).toFixed(2)
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
