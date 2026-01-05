import { Decimal } from "./decimal"

/**
 * Cash flow structure for XIRR calculation
 */
export interface CashFlowForXIRR {
  date: Date
  amount: Decimal
}

/**
 * Calculates XIRR (Extended Internal Rate of Return) using Newton-Raphson method
 * Returns annualized return rate as a percentage (e.g., 15.0 for 15%)
 * Matches the backend logic in backend/internal/utils/xirr.go
 */
export function calculateXIRR(cashFlows: CashFlowForXIRR[], guess: number = 0.1): string {
  if (cashFlows.length < 2) {
    return "0"
  }

  const maxIterations = 100
  const tolerance = 1e-6

  let rate = guess

  for (let i = 0; i < maxIterations; i++) {
    const { npv, derivative } = calculateNPVAndDerivative(cashFlows, rate)

    if (Math.abs(npv) < tolerance) {
      return new Decimal(rate * 100).toFixed(2)
    }

    if (Math.abs(derivative) < tolerance) {
      return "0" // Cannot converge
    }

    rate = rate - npv / derivative

    // Prevent extreme values
    if (rate < -0.99) {
      rate = -0.99
    }
    if (rate > 10) {
      rate = 10
    }
  }

  return "0" // Failed to converge
}

function calculateNPVAndDerivative(
  cashFlows: CashFlowForXIRR[],
  rate: number,
): { npv: number; derivative: number } {
  const firstDate = cashFlows[0].date
  let npv = 0.0
  let derivative = 0.0

  for (const cf of cashFlows) {
    const years = yearsBetween(firstDate, cf.date)
    const amount = Number(cf.amount.toString())
    const discountFactor = Math.pow(1 + rate, years)

    npv += amount / discountFactor
    derivative -= (years * amount) / Math.pow(1 + rate, years + 1)
  }

  return { npv, derivative }
}

function yearsBetween(start: Date, end: Date): number {
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000
  const duration = end.getTime() - start.getTime()
  return duration / msPerYear
}

