package services

import (
	"testing"
	"time"

	"github.com/shopspring/decimal"
)

func TestFeeTotalsMismatch(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		diff  string
		want  bool
	}{
		{"zero", "0", false},
		{"within tolerance", "0.005", false},
		{"at tolerance boundary", "0.01", false},
		{"above tolerance", "0.15", true},
		{"negative above tolerance", "-0.15", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			d, err := decimal.NewFromString(tt.diff)
			if err != nil {
				t.Fatalf("parse diff: %v", err)
			}
			if got := feeTotalsMismatch(d); got != tt.want {
				t.Errorf("feeTotalsMismatch(%s) = %v, want %v", tt.diff, got, tt.want)
			}
		})
	}
}

func TestFeesByMonthSQLContainsMonthGrouping(t *testing.T) {
	t.Parallel()

	assertSQLFragments(t, feesByMonthSQL(), []string{
		"type = 'fee'",
		"to_char(date_trunc('month', date), 'YYYY-MM')",
		"SUM(usd_amount)",
	})
}

func TestFeesByMonthSQLWithDateRange(t *testing.T) {
	t.Parallel()

	start := mustParseDate(t, "2024-01-15")
	end := mustParseDate(t, "2024-06-30")
	query, _, _ := appendCashFlowFeeDateRange(feesByMonthSQL(), []interface{}{"user-1"}, 1, &DateRange{
		StartDate: &start,
		EndDate:   &end,
	})

	assertSQLFragments(t, query, []string{
		"date >= $2",
		"date <= $3",
	})
}

func mustParseDate(t *testing.T, s string) time.Time {
	t.Helper()
	parsed, err := time.Parse("2006-01-02", s)
	if err != nil {
		t.Fatalf("parse date %q: %v", s, err)
	}
	return parsed
}
