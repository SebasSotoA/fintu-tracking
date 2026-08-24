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

	fxRows, err := s.repo.GetFXImpactCashFlows(ctx, userID)
	if err != nil {
		return report, fmt.Errorf("failed to load fx-impact cash flows: %w", err)
	}
	avgRate := weightedAvgFXRate(fxRows)
	report.AvgInvestmentRate = avgRate

	currentRate, err := s.repo.GetLatestFXRate(ctx, userID)
	if err != nil {
		return report, fmt.Errorf("failed to get current FX rate: %w", err)
	}
	if currentRate == "" {
		currentRate = avgRate
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

	periods, err := s.repo.GetFXRatePeriods(ctx, userID)
	if err == nil {
		for _, p := range periods {
			report.ImpactByPeriod[p.Period] = p.Rate
		}
	}

	return report, nil
}

// weightedAvgFXRate computes SUM(usd_amount * fx_rate) / SUM(usd_amount) over
// deposit cash flows with a non-null fx_rate, returning "0" when not
// computable (no rows or zero total amount).
func weightedAvgFXRate(rows []models.AnalyticsFXImpactCashFlowRow) string {
	weightedSum := decimal.Zero
	totalAmount := decimal.Zero
	for _, row := range rows {
		amount, err := decimal.NewFromString(row.USDAmount)
		if err != nil {
			continue
		}
		if row.FXRate == nil {
			continue
		}
		rate, err := decimal.NewFromString(*row.FXRate)
		if err != nil {
			continue
		}
		weightedSum = weightedSum.Add(amount.Mul(rate))
		totalAmount = totalAmount.Add(amount)
	}
	if totalAmount.IsZero() {
		return "0"
	}
	return weightedSum.Div(totalAmount).String()
}