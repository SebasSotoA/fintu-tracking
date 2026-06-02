package services

import (
	"sort"
	"time"

	"github.com/shopspring/decimal"
	"fintu-tracking-backend/internal/models"
)

type performanceCashFlow struct {
	Date              time.Time
	Type              string
	USDAmount         decimal.Decimal
	RelatedCashFlowID *string
}

type performanceTrade struct {
	Date     time.Time
	Side     string
	Ticker   string
	Quantity decimal.Decimal
	Price    decimal.Decimal
	Fee      decimal.Decimal
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
		case "fee":
			cashDec = cashDec.Sub(cf.USDAmount)
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
			cashDec = cashDec.Sub(notional.Add(tr.Fee))
		case "sell":
			h.qty = h.qty.Sub(tr.Quantity)
			h.price = tr.Price
			cashDec = cashDec.Add(notional.Sub(tr.Fee))
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
