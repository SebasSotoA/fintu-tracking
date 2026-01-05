package utils

import (
	"math"
	"time"

	"github.com/shopspring/decimal"
)

// CashFlowForXIRR represents a cash flow with date and amount for XIRR calculation
type CashFlowForXIRR struct {
	Date   time.Time
	Amount decimal.Decimal
}

// CalculateXIRR calculates XIRR (Extended Internal Rate of Return) using Newton-Raphson method
// Returns annualized return rate as a percentage (e.g., 15.0 for 15%)
func CalculateXIRR(cashFlows []CashFlowForXIRR, guess float64) string {
	if len(cashFlows) < 2 {
		return "0"
	}

	const maxIterations = 100
	const tolerance = 1e-6

	rate := guess

	for i := 0; i < maxIterations; i++ {
		npv, derivative := calculateNPVAndDerivative(cashFlows, rate)

		if math.Abs(npv) < tolerance {
			return decimal.NewFromFloat(rate * 100).String()
		}

		if math.Abs(derivative) < tolerance {
			return "0" // Cannot converge
		}

		rate = rate - npv/derivative

		// Prevent extreme values
		if rate < -0.99 {
			rate = -0.99
		}
		if rate > 10 {
			rate = 10
		}
	}

	return "0" // Failed to converge
}

func calculateNPVAndDerivative(cashFlows []CashFlowForXIRR, rate float64) (float64, float64) {
	firstDate := cashFlows[0].Date
	npv := 0.0
	derivative := 0.0

	for _, cf := range cashFlows {
		years := yearsBetween(firstDate, cf.Date)
		amount, _ := cf.Amount.Float64()
		discountFactor := math.Pow(1+rate, years)

		npv += amount / discountFactor
		derivative -= (years * amount) / math.Pow(1+rate, years+1)
	}

	return npv, derivative
}

func yearsBetween(start, end time.Time) float64 {
	const msPerYear = 365.25 * 24 * 60 * 60 * 1000
	duration := end.Sub(start).Milliseconds()
	return float64(duration) / msPerYear
}

