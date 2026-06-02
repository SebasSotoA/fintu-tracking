package services

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
	"fintu-tracking-backend/internal/models"
)

type spyPricePoint struct {
	date  time.Time
	price decimal.Decimal
}

// attachSPYBenchmark sets SpyIndexed on each point (indexed to 100 at first portfolio date).
func attachSPYBenchmark(ctx context.Context, pool *pgxpool.Pool, points []models.PerformancePoint) ([]models.PerformancePoint, error) {
	if len(points) == 0 {
		return points, nil
	}

	rows, err := pool.Query(ctx, `
		SELECT updated_at::date, price::text
		FROM market_prices
		WHERE ticker = 'SPY'
		ORDER BY updated_at ASC
	`)
	if err != nil {
		return points, fmt.Errorf("load SPY prices: %w", err)
	}
	defer rows.Close()

	spyPrices := make([]spyPricePoint, 0)
	for rows.Next() {
		var d time.Time
		var p string
		if err := rows.Scan(&d, &p); err != nil {
			return points, err
		}
		price, err := decimal.NewFromString(p)
		if err != nil {
			continue
		}
		spyPrices = append(spyPrices, spyPricePoint{date: d, price: price})
	}
	if err := rows.Err(); err != nil {
		return points, err
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
