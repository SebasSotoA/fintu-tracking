package services

import (
	"context"
	"fmt"
	"sort"
	"time"

	"fintu-tracking-backend/internal/models"
	"github.com/shopspring/decimal"
)

// GetPerformanceTimeSeries returns portfolio performance over time.
// Uses portfolio_snapshots when present; otherwise builds points from trades and cash flows.
// interval buckets points as day (default), week, month, or year (last activity date per bucket).
func (s *AnalyticsService) GetPerformanceTimeSeries(ctx context.Context, userID, interval string) ([]models.PerformancePoint, error) {
	interval = normalizePerformanceInterval(interval)

	snapshots, err := s.repo.GetPerformanceSnapshots(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query performance time series: %w", err)
	}

	var points []models.PerformancePoint
	for _, snap := range snapshots {
		point := models.PerformancePoint{
			Date:               snap.SnapshotDate,
			PortfolioValue:     snap.TotalValueUSD,
			InvestedCapital:    snap.TotalInvestedUSD,
			CumulativeFees:     snap.TotalFeesUSD,
			CumulativeFXImpact: snap.TotalFXImpactUSD,
		}

		value, _ := decimal.NewFromString(snap.TotalValueUSD)
		investedDec, _ := decimal.NewFromString(snap.TotalInvestedUSD)
		netReturn := value.Sub(investedDec)
		point.NetReturn = netReturn.String()

		if !investedDec.IsZero() {
			netReturnPct := netReturn.Div(investedDec).Mul(decimal.NewFromInt(100))
			point.NetReturnPct = netReturnPct.String()
		} else {
			point.NetReturnPct = "0"
		}

		points = append(points, point)
	}

	if len(points) == 0 {
		points, err = s.generatePerformancePoints(ctx, userID, interval)
		if err != nil {
			return nil, fmt.Errorf("failed to generate performance points: %w", err)
		}
	} else {
		points = aggregatePerformancePointsByInterval(points, interval)
	}

	points, err = s.attachSPYBenchmark(ctx, points)
	if err != nil {
		return nil, err
	}

	return points, nil
}

func (s *AnalyticsService) generatePerformancePoints(ctx context.Context, userID, interval string) ([]models.PerformancePoint, error) {
	activity, err := s.loadPerformanceActivity(ctx, userID)
	if err != nil {
		return nil, err
	}
	return computePerformancePointsFromActivity(activity, interval), nil
}

func (s *AnalyticsService) loadPerformanceActivity(ctx context.Context, userID string) (performanceActivity, error) {
	var activity performanceActivity

	cfRows, err := s.repo.GetPerformanceActivityCashFlows(ctx, userID)
	if err != nil {
		return activity, fmt.Errorf("load cash flows: %w", err)
	}
	for _, row := range cfRows {
		amount, err := decimal.NewFromString(row.USDAmount)
		if err != nil {
			return activity, fmt.Errorf("parse cash flow usd_amount %q: %w", row.USDAmount, err)
		}
		activity.CashFlows = append(activity.CashFlows, performanceCashFlow{
			Date:              row.Date,
			Type:              row.Type,
			USDAmount:         amount,
			RelatedTradeID:    row.RelatedTradeID,
			RelatedCashFlowID: row.RelatedCashFlowID,
		})
	}

	trRows, err := s.repo.GetPerformanceActivityTrades(ctx, userID)
	if err != nil {
		return activity, fmt.Errorf("load trades: %w", err)
	}
	for _, row := range trRows {
		qty, err := decimal.NewFromString(row.Quantity)
		if err != nil {
			return activity, fmt.Errorf("parse trade quantity %q: %w", row.Quantity, err)
		}
		price, err := decimal.NewFromString(row.Price)
		if err != nil {
			return activity, fmt.Errorf("parse trade price %q: %w", row.Price, err)
		}
		fees, err := decimal.NewFromString(row.TotalFees)
		if err != nil {
			return activity, fmt.Errorf("parse trade fees %q: %w", row.TotalFees, err)
		}
		activity.Trades = append(activity.Trades, performanceTrade{
			Date:              row.Date,
			Side:              row.Side,
			Ticker:            row.Ticker,
			Quantity:          qty,
			Price:             price,
			TotalFees:         fees,
			IsOpeningPosition: row.IsOpeningPosition,
		})
	}

	return activity, nil
}

type performanceCashFlow struct {
	Date              time.Time
	Type              string
	USDAmount         decimal.Decimal
	RelatedTradeID    *string
	RelatedCashFlowID *string
}

type performanceTrade struct {
	Date              time.Time
	Side              string
	Ticker            string
	Quantity          decimal.Decimal
	Price             decimal.Decimal
	TotalFees         decimal.Decimal
	IsOpeningPosition bool
}

type performanceActivity struct {
	CashFlows []performanceCashFlow
	Trades    []performanceTrade
}

func normalizePerformanceInterval(interval string) string {
	switch interval {
	case "day", "week", "month", "year":
		return interval
	default:
		return "day"
	}
}

func performanceBucketKey(d time.Time, interval string) string {
	y, m, day := d.Date()
	switch interval {
	case "year":
		return time.Date(y, 1, 1, 0, 0, 0, 0, time.UTC).Format("2006-01-02")
	case "month":
		return time.Date(y, m, 1, 0, 0, 0, 0, time.UTC).Format("2006-01-02")
	case "week":
		weekday := int(d.Weekday())
		if weekday == 0 {
			weekday = 7
		}
		start := d.AddDate(0, 0, -(weekday - 1))
		return start.UTC().Format("2006-01-02")
	default:
		return time.Date(y, m, day, 0, 0, 0, 0, time.UTC).Format("2006-01-02")
	}
}

func bucketPerformanceDates(dates []time.Time, interval string) []time.Time {
	if len(dates) == 0 {
		return nil
	}
	interval = normalizePerformanceInterval(interval)
	if interval == "day" {
		out := make([]time.Time, len(dates))
		copy(out, dates)
		return out
	}

	buckets := make(map[string]time.Time)
	for _, d := range dates {
		key := performanceBucketKey(d, interval)
		if existing, ok := buckets[key]; !ok || d.After(existing) {
			buckets[key] = d
		}
	}

	out := make([]time.Time, 0, len(buckets))
	for _, d := range buckets {
		out = append(out, d)
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].Before(out[j])
	})
	return out
}

func (a performanceActivity) collectEventDates() []time.Time {
	seen := make(map[string]struct{})
	var dates []time.Time

	add := func(d time.Time) {
		d = truncateToUTCDate(d)
		key := d.Format("2006-01-02")
		if _, ok := seen[key]; ok {
			return
		}
		seen[key] = struct{}{}
		dates = append(dates, d)
	}

	for _, cf := range a.CashFlows {
		add(cf.Date)
	}
	for _, tr := range a.Trades {
		add(tr.Date)
	}

	sort.Slice(dates, func(i, j int) bool {
		return dates[i].Before(dates[j])
	})
	return dates
}

func truncateToUTCDate(d time.Time) time.Time {
	y, m, day := d.Date()
	return time.Date(y, m, day, 0, 0, 0, 0, time.UTC)
}

func computePerformancePointsFromActivity(activity performanceActivity, interval string) []models.PerformancePoint {
	interval = normalizePerformanceInterval(interval)
	dates := bucketPerformanceDates(activity.collectEventDates(), interval)
	if len(dates) == 0 {
		return nil
	}

	points := make([]models.PerformancePoint, 0, len(dates))
	for _, asOf := range dates {
		invested, fees, portfolio, fxImpact := activity.metricsAsOf(asOf)
		points = append(points, finalizePerformancePoint(asOf, invested, fees, portfolio, fxImpact))
	}
	return points
}

func (a performanceActivity) metricsAsOf(asOf time.Time) (invested, fees, portfolio, fxImpact string) {
	asOf = truncateToUTCDate(asOf)

	investedDec := decimal.Zero
	feesDec := decimal.Zero
	cashDec := decimal.Zero

	for _, cf := range a.CashFlows {
		if truncateToUTCDate(cf.Date).After(asOf) {
			continue
		}
		switch cf.Type {
		case "deposit":
			cashDec = cashDec.Add(cf.USDAmount)
			investedDec = investedDec.Add(netInvestedContribution(cf.Type, cf.USDAmount, cf.RelatedCashFlowID))
		case "withdrawal":
			cashDec = cashDec.Sub(cf.USDAmount)
			investedDec = investedDec.Add(netInvestedContribution(cf.Type, cf.USDAmount, cf.RelatedCashFlowID))
		case "cash_adjustment":
			cashDec = cashDec.Add(cf.USDAmount)
		case "fee":
			if cf.RelatedTradeID == nil && cf.RelatedCashFlowID == nil {
				cashDec = cashDec.Sub(cf.USDAmount)
			}
			feesDec = feesDec.Add(cf.USDAmount)
			investedDec = investedDec.Add(netInvestedContribution(cf.Type, cf.USDAmount, cf.RelatedCashFlowID))
		}
	}

	type holding struct {
		qty   decimal.Decimal
		price decimal.Decimal
	}
	holdings := make(map[string]holding)

	for _, tr := range a.Trades {
		if truncateToUTCDate(tr.Date).After(asOf) {
			continue
		}
		h := holdings[tr.Ticker]
		notional := tr.Quantity.Mul(tr.Price)
		switch tr.Side {
		case "buy":
			h.qty = h.qty.Add(tr.Quantity)
			h.price = tr.Price
			if !tr.IsOpeningPosition {
				cashDec = cashDec.Sub(notional.Add(tr.TotalFees))
			}
		case "sell":
			h.qty = h.qty.Sub(tr.Quantity)
			h.price = tr.Price
			cashDec = cashDec.Add(notional.Sub(tr.TotalFees))
		}
		holdings[tr.Ticker] = h
	}

	holdingsValue := decimal.Zero
	for _, h := range holdings {
		if h.qty.GreaterThan(decimal.Zero) {
			holdingsValue = holdingsValue.Add(h.qty.Mul(h.price))
		}
	}

	portfolioDec := holdingsValue.Add(cashDec)
	return investedDec.String(), feesDec.String(), portfolioDec.String(), "0"
}

func finalizePerformancePoint(
	asOf time.Time,
	invested, fees, portfolio, fxImpact string,
) models.PerformancePoint {
	point := models.PerformancePoint{
		Date:               asOf,
		PortfolioValue:     portfolio,
		InvestedCapital:    invested,
		CumulativeFees:     fees,
		CumulativeFXImpact: fxImpact,
		NetReturn:          "0",
		NetReturnPct:       "0",
	}

	value, err := decimal.NewFromString(portfolio)
	if err != nil {
		return point
	}
	investedDec, err := decimal.NewFromString(invested)
	if err != nil {
		return point
	}

	netReturn := value.Sub(investedDec)
	point.NetReturn = netReturn.String()
	if !investedDec.IsZero() {
		point.NetReturnPct = netReturn.Div(investedDec).Mul(decimal.NewFromInt(100)).String()
	}
	return point
}

func aggregatePerformancePointsByInterval(points []models.PerformancePoint, interval string) []models.PerformancePoint {
	interval = normalizePerformanceInterval(interval)
	if interval == "day" || len(points) == 0 {
		return points
	}

	dates := make([]time.Time, len(points))
	for i, p := range points {
		dates[i] = p.Date
	}
	bucketEnds := bucketPerformanceDates(dates, interval)
	if len(bucketEnds) == 0 {
		return points
	}

	byDate := make(map[string]models.PerformancePoint, len(points))
	for _, p := range points {
		byDate[p.Date.Format("2006-01-02")] = p
	}

	out := make([]models.PerformancePoint, 0, len(bucketEnds))
	for _, end := range bucketEnds {
		key := end.Format("2006-01-02")
		if p, ok := byDate[key]; ok {
			out = append(out, p)
			continue
		}
		var latest models.PerformancePoint
		found := false
		for _, p := range points {
			if !p.Date.After(end) && (!found || p.Date.After(latest.Date)) {
				latest = p
				found = true
			}
		}
		if found {
			latest.Date = end
			out = append(out, latest)
		}
	}
	return out
}
