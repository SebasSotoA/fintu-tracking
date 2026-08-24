package services

import (
	"context"
	"fmt"
	"time"

	"github.com/shopspring/decimal"
	"fintu-tracking-backend/internal/models"
)

type spyPricePoint struct {
	date  time.Time
	price decimal.Decimal
}

// attachSPYBenchmark sets SpyIndexed on each point (indexed to 100 at first
// portfolio date). It is a method on AnalyticsService so it uses the
// repository and stays unit-testable.
func (s *AnalyticsService) attachSPYBenchmark(ctx context.Context, points []models.PerformancePoint) ([]models.PerformancePoint, error) {
	if len(points) == 0 {
		return points, nil
	}

	rows, err := s.repo.GetSPYBenchmarkPrices(ctx)
	if err != nil {
		return points, fmt.Errorf("load spy prices: %w", err)
	}

	spyPrices := make([]spyPricePoint, 0, len(rows))
	for _, row := range rows {
		price, err := decimal.NewFromString(row.Price)
		if err != nil {
			continue
		}
		spyPrices = append(spyPrices, spyPricePoint{date: row.Date, price: price})
	}
	if len(spyPrices) == 0 {
		return points, nil
	}

	firstSPY := spyPriceOnOrBefore(spyPrices, points[0].Date)
	if firstSPY.IsZero() {
		return points, nil
	}

	out := make([]models.PerformancePoint, len(points))
	for i, pt := range points {
		out[i] = pt
		spy := spyPriceOnOrBefore(spyPrices, pt.Date)
		if spy.IsZero() {
			out[i].SpyIndexed = ""
			continue
		}
		indexed := spy.Div(firstSPY).Mul(decimal.NewFromInt(100))
		out[i].SpyIndexed = indexed.StringFixed(2)
	}
	return out, nil
}

func spyPriceOnOrBefore(prices []spyPricePoint, asOf time.Time) decimal.Decimal {
	var last decimal.Decimal
	for _, p := range prices {
		if p.date.After(asOf) {
			break
		}
		last = p.price
	}
	return last
}