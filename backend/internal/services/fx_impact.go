package services

import (
	"context"
	"fmt"

	"fintu-tracking-backend/internal/models"
	"github.com/shopspring/decimal"
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
	avgRate, usdDeposited := weightedAvgFXRate(fxRows)
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

	if !avg.IsZero() && !current.IsZero() {
		impactUSD := usdDeposited.Mul(current.Sub(avg)).Div(current)
		report.FXImpactUSD = impactUSD.String()
		if !usdDeposited.IsZero() {
			report.FXImpactPct = impactUSD.Div(usdDeposited).Mul(decimal.NewFromInt(100)).String()
		}
	}

	periods, err := s.repo.GetFXRatePeriods(ctx, userID)
	if err == nil {
		for _, p := range periods {
			report.ImpactByPeriod[p.Period] = p.Rate
		}
	}

	return report, nil
}

// weightedAvgFXRate computes SUM(usd_amount * fx_rate) / SUM(usd_amount) over
// deposit cash flows with a non-null fx_rate. It returns "0" and a zero USD
// total when not computable (no rows or zero total amount).
func weightedAvgFXRate(rows []models.AnalyticsFXImpactCashFlowRow) (avgRate string, usdDeposited decimal.Decimal) {
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
		return "0", decimal.Zero
	}
	return weightedSum.Div(totalAmount).String(), totalAmount
}
