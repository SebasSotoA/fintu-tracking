package services

import (
	"context"
	"os"
	"testing"
	"time"

	"fintu-tracking-backend/internal/repositories"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFeeTotalsMismatch(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		diff string
		want bool
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

func mustParseDate(t *testing.T, s string) time.Time {
	t.Helper()
	parsed, err := time.Parse("2006-01-02", s)
	if err != nil {
		t.Fatalf("parse date %q: %v", s, err)
	}
	return parsed
}

func TestFeeService_GetTotalFeesByType(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dsn)
	require.NoError(t, err)
	defer pool.Close()

	s := NewFeeService(repositories.NewPostgresFeeRepository(pool))
	userID := uuid.New().String()

	start := mustParseDate(t, "2024-01-01")
	end := mustParseDate(t, "2024-12-31")
	dateRange := &DateRange{StartDate: &start, EndDate: &end}

	breakdown, err := s.GetTotalFeesByType(ctx, userID, dateRange)
	require.NoError(t, err)
	assert.Equal(t, "0", breakdown.TotalFees)
	assert.NotNil(t, breakdown.FeesByMonth)
}

func TestFeeService_ReconcileCashFlowFees(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dsn)
	require.NoError(t, err)
	defer pool.Close()

	s := NewFeeService(repositories.NewPostgresFeeRepository(pool))
	userID := uuid.New().String()

	report, err := s.ReconcileCashFlowFees(ctx, userID)
	require.NoError(t, err)
	// A user with no trades and no fee cash flows is fully reconciled.
	assert.True(t, report.IsReconciled)
	assert.Equal(t, "0", report.TotalTradeFees)
	assert.Equal(t, "0", report.TotalCashFlowFees)
	assert.Equal(t, "0", report.Difference)
	assert.Empty(t, report.MissingLinks)
	assert.Empty(t, report.OrphanedCashFlows)
	assert.Empty(t, report.UnlinkedCashFlows)
	assert.Empty(t, report.Discrepancies)
}

func TestFeeService_GetFeeEfficiency(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dsn)
	require.NoError(t, err)
	defer pool.Close()

	s := NewFeeService(repositories.NewPostgresFeeRepository(pool))
	userID := uuid.New().String()

	efficiency, err := s.GetFeeEfficiency(ctx, userID, "ticker")
	require.NoError(t, err)
	require.NotNil(t, efficiency)
	assert.IsType(t, []map[string]string{}, efficiency["by_ticker"])
}