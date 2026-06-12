package services

import (
	"testing"
	"time"

	"github.com/shopspring/decimal"
	"fintu-tracking-backend/internal/models"
)

func fixtureUserPerformanceActivity() performanceActivity {
	depositID := "deposit-cf-1"
	return performanceActivity{
		CashFlows: []performanceCashFlow{
			{
				Date:      time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC),
				Type:      "deposit",
				USDAmount: dec("995"),
			},
			{
				Date:              time.Date(2024, 1, 15, 0, 0, 0, 0, time.UTC),
				Type:              "fee",
				USDAmount:         dec("5"),
				RelatedCashFlowID: &depositID,
			},
		},
		Trades: []performanceTrade{
			{
				Date:     time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
				Side:     "buy",
				Ticker:   "AAPL",
				Quantity: dec("2"),
				Price:    dec("150"),
				TotalFees: dec("1"),
			},
		},
	}
}

func TestComputePerformancePoints_FixtureUserWithActivity(t *testing.T) {
	t.Parallel()

	activity := fixtureUserPerformanceActivity()

	tests := []struct {
		name     string
		interval string
		minLen   int
	}{
		{"day interval", "day", 2},
		{"month interval", "month", 2},
		{"default invalid interval uses day", "quarter", 2},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			points := computePerformancePointsFromActivity(activity, tt.interval)
			if len(points) < tt.minLen {
				t.Fatalf("len(points) = %d, want at least %d", len(points), tt.minLen)
			}
			last := points[len(points)-1]
			invested, err := decimal.NewFromString(last.InvestedCapital)
			if err != nil {
				t.Fatalf("parse invested: %v", err)
			}
			if !invested.GreaterThan(decimal.Zero) {
				t.Errorf("last point invested capital = %s, want > 0", last.InvestedCapital)
			}
			if last.NetReturn == "" {
				t.Error("expected net return to be set")
			}
		})
	}
}

func TestBucketPerformanceDates(t *testing.T) {
	t.Parallel()

	dates := []time.Time{
		time.Date(2024, 1, 5, 0, 0, 0, 0, time.UTC),
		time.Date(2024, 1, 20, 0, 0, 0, 0, time.UTC),
		time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
	}

	monthly := bucketPerformanceDates(dates, "month")
	if len(monthly) != 2 {
		t.Fatalf("month buckets: got %d dates, want 2", len(monthly))
	}
	if !monthly[0].Equal(dates[1]) {
		t.Errorf("jan bucket end = %v, want %v", monthly[0], dates[1])
	}
	if !monthly[1].Equal(dates[2]) {
		t.Errorf("feb bucket end = %v, want %v", monthly[1], dates[2])
	}

	daily := bucketPerformanceDates(dates, "day")
	if len(daily) != 3 {
		t.Fatalf("day buckets: got %d dates, want 3", len(daily))
	}
}

func TestFinalizePerformancePoint(t *testing.T) {
	t.Parallel()

	point := finalizePerformancePoint(
		time.Date(2024, 3, 1, 0, 0, 0, 0, time.UTC),
		"1000",
		"25",
		"1100",
		"0",
	)

	if point.NetReturn != "100" {
		t.Errorf("NetReturn = %s, want 100", point.NetReturn)
	}
	if point.NetReturnPct != "10" {
		t.Errorf("NetReturnPct = %s, want 10", point.NetReturnPct)
	}
}

func TestComputePerformancePoints_GranularFeesOnly(t *testing.T) {
	t.Parallel()

	activity := performanceActivity{
		CashFlows: []performanceCashFlow{
			{
				Date:      time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC),
				Type:      "deposit",
				USDAmount: dec("1000"),
			},
		},
		Trades: []performanceTrade{
			{
				Date:      time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC),
				Side:      "buy",
				Ticker:    "AAPL",
				Quantity:  dec("1"),
				Price:     dec("100"),
				TotalFees: dec("2.50"),
			},
		},
	}

	points := computePerformancePointsFromActivity(activity, "day")
	if len(points) < 2 {
		t.Fatalf("len(points) = %d, want at least 2", len(points))
	}
	last := points[len(points)-1]
	portfolio, err := decimal.NewFromString(last.PortfolioValue)
	if err != nil {
		t.Fatalf("parse portfolio: %v", err)
	}
	want := dec("997.5")
	if !portfolio.Equal(want) {
		t.Errorf("portfolio value = %s, want %s (holdings 100 + cash 897.5 after buy fees)", portfolio, want)
	}
}

func TestAggregatePerformancePointsByInterval(t *testing.T) {
	t.Parallel()

	points := []models.PerformancePoint{
		{Date: time.Date(2024, 1, 5, 0, 0, 0, 0, time.UTC), PortfolioValue: "100"},
		{Date: time.Date(2024, 1, 20, 0, 0, 0, 0, time.UTC), PortfolioValue: "200"},
		{Date: time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC), PortfolioValue: "300"},
	}

	aggregated := aggregatePerformancePointsByInterval(points, "month")
	if len(aggregated) != 2 {
		t.Fatalf("got %d points, want 2", len(aggregated))
	}
	if aggregated[0].PortfolioValue != "200" {
		t.Errorf("jan point value = %s, want 200", aggregated[0].PortfolioValue)
	}
	if aggregated[1].PortfolioValue != "300" {
		t.Errorf("feb point value = %s, want 300", aggregated[1].PortfolioValue)
	}
}
