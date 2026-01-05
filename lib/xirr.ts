import { Decimal } from "./decimal"

interface CashFlowForXIRR {
  date: Date
  amount: Decimal
}

/**
 * Calculate XIRR (Extended Internal Rate of Return) using Newton-Raphson method
 * Returns annualized return rate as a decimal (e.g., 0.15 for 15%)
 */
export function calculateXIRR(cashFlows: CashFlowForXIRR[], guess = 0.1): string {
  if (cashFlows.length < 2) {
    return "0"
  }

  const maxIterations = 100
  const tolerance = 1e-6

  let rate = guess

  for (let i = 0; i < maxIterations; i++) {
    const { npv, derivative } = calculateNPVAndDerivative(cashFlows, rate)

    if (Math.abs(npv) < tolerance) {
      return new Decimal(rate).mul(100).toString() // Convert to percentage
    }

    if (Math.abs(derivative) < tolerance) {
      return "0" // Cannot converge
    }

    rate = rate - npv / derivative

    // Prevent extreme values
    if (rate < -0.99) rate = -0.99
    if (rate > 10) rate = 10
  }

  return "0" // Failed to converge
}

function calculateNPVAndDerivative(cashFlows: CashFlowForXIRR[], rate: number): { npv: number; derivative: number } {
  const firstDate = cashFlows[0].date
  let npv = 0
  let derivative = 0

  for (const cf of cashFlows) {
    const years = yearsBetween(firstDate, cf.date)
    const amount = cf.amount.toNumber()
    const discountFactor = Math.pow(1 + rate, years)

    npv += amount / discountFactor
    derivative -= (years * amount) / Math.pow(1 + rate, years + 1)
  }

  return { npv, derivative }
}

function yearsBetween(start: Date, end: Date): number {
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000
  return (end.getTime() - start.getTime()) / msPerYear
}
