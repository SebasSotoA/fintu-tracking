package services

import (
	"context"
	"fmt"

	"github.com/shopspring/decimal"
	"fintu-tracking-backend/internal/models"
)

// CalculateFXImpact analyzes the impact of exchange rate changes
func (s *AnalyticsService) CalculateFXImpact(ctx context.Context, userID string) (models.FXImpactReport, error) {
	report := models.FXImpactReport{
		AvgInvestmentRate: "0",
		CurrentRate:       "0",
		RateChangePct:     "0",
		FXImpactUSD:       "0",
		FXImpactPct:       "0",
		ImpactByPeriod:    make(map[string]string),
	}

	var avgRate string
	err := s.pool.QueryRow(ctx, `
		SELECT 
			COALESCE(
				SUM(cf.usd_amount * cf.fx_rate) / NULLIF(SUM(cf.usd_amount), 0),
				0
			) as weighted_avg_rate
		FROM cash_flows cf
		WHERE cf.user_id = $1 
			AND cf.type = 'deposit' 
			AND cf.fx_rate IS NOT NULL
	`, userID).Scan(&avgRate)
	if err != nil {
		avgRate = "0"
	}
	report.AvgInvestmentRate = avgRate

	var currentRate string
	err = s.pool.QueryRow(ctx, `
		SELECT rate
		FROM fx_rates
		WHERE user_id = $1
		ORDER BY date DESC
		LIMIT 1
	`, userID).Scan(&currentRate)
	if err != nil {
		if err != nil && err.Error() == "no rows in result set" {
			currentRate = avgRate
		} else {
			return report, fmt.Errorf("failed to get current FX rate: %w", err)
		}
	}
	report.CurrentRate = currentRate

	avg, _ := decimal.NewFromString(avgRate)
	current, _ := decimal.NewFromString(currentRate)

	if !avg.IsZero() {
		rateChange := current.Sub(avg).Div(avg).Mul(decimal.NewFromInt(100))
		report.RateChangePct = rateChange.String()
	}

	report.FXImpactUSD = "0"
	report.FXImpactPct = "0"

	periodRows, err := s.pool.Query(ctx, `
		SELECT 
			TO_CHAR(date, 'YYYY-MM') as period,
			AVG(rate) as avg_rate
		FROM fx_rates
		WHERE user_id = $1
		GROUP BY TO_CHAR(date, 'YYYY-MM')
		ORDER BY period DESC
		LIMIT 12
	`, userID)
	if err == nil {
		defer periodRows.Close()
		for periodRows.Next() {
			var period, rate string
			if err := periodRows.Scan(&period, &rate); err == nil {
				report.ImpactByPeriod[period] = rate
			}
		}
	}

	return report, nil
}
