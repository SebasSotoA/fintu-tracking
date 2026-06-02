package services

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
)

type xirrCashFlow struct {
	date   time.Time
	amount decimal.Decimal
}

// calculateXIRR approximates money-weighted return from deposit/withdrawal cash flows.
// Returns annualized rate as decimal fraction (e.g. 0.12 = 12%). Zero if not computable.
func calculateXIRR(ctx context.Context, pool *pgxpool.Pool, userID string, terminalValue decimal.Decimal, asOf time.Time) (decimal.Decimal, error) {
	rows, err := pool.Query(ctx, `
		SELECT date, type, usd_amount
		FROM cash_flows
		WHERE user_id = $1 AND type IN ('deposit', 'withdrawal')
		ORDER BY date ASC
	`, userID)
	if err != nil {
		return decimal.Zero, fmt.Errorf("load cash flows for xirr: %w", err)
	}
	defer rows.Close()

	flows := make([]xirrCashFlow, 0)
	for rows.Next() {
		var date time.Time
		var flowType string
		var amount string
		if err := rows.Scan(&date, &flowType, &amount); err != nil {
			return decimal.Zero, err
		}
		amt, err := decimal.NewFromString(amount)
		if err != nil {
			continue
		}
		switch flowType {
		case "deposit":
			flows = append(flows, xirrCashFlow{date: date, amount: amt})
		case "withdrawal":
			flows = append(flows, xirrCashFlow{date: date, amount: amt.Neg()})
		}
	}
	if err := rows.Err(); err != nil {
		return decimal.Zero, err
	}
	if len(flows) == 0 {
		return decimal.Zero, nil
	}

	flows = append(flows, xirrCashFlow{date: asOf, amount: terminalValue.Neg()})

	rate, ok := solveXIRR(flows)
	if !ok {
		return decimal.Zero, nil
	}
	return rate, nil
}

func solveXIRR(flows []xirrCashFlow) (decimal.Decimal, bool) {
	if len(flows) < 2 {
		return decimal.Zero, false
	}
	base := flows[0].date
	guess := 0.1
	for i := 0; i < 50; i++ {
		npv := xnpv(guess, flows, base)
		dnpv := xnpvDerivative(guess, flows, base)
		if dnpv == 0 {
			break
		}
		next := guess - npv/dnpv
		if next < -0.999 {
			next = -0.999
		}
		if math.Abs(next-guess) < 1e-7 {
			return decimal.NewFromFloat(next), true
		}
		guess = next
	}
	return decimal.Zero, false
}

func xnpv(rate float64, flows []xirrCashFlow, base time.Time) float64 {
	sum := 0.0
	for _, f := range flows {
		years := f.date.Sub(base).Hours() / (24 * 365.25)
		sum += f.amount.InexactFloat64() / math.Pow(1+rate, years)
	}
	return sum
}

func xnpvDerivative(rate float64, flows []xirrCashFlow, base time.Time) float64 {
	sum := 0.0
	for _, f := range flows {
		years := f.date.Sub(base).Hours() / (24 * 365.25)
		if years == 0 {
			continue
		}
		denom := math.Pow(1+rate, years)
		sum -= years * f.amount.InexactFloat64() / (denom * (1 + rate))
	}
	return sum
}
