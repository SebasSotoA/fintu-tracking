package services

import (
	"context"
	"fmt"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"fintu-tracking-backend/internal/database"

	"github.com/google/uuid"
)

var svcTestDBOnce sync.Once

func initSvcTestDB(t *testing.T) {
	t.Helper()
	svcTestDBOnce.Do(func() {
		testURL := os.Getenv("TEST_DATABASE_URL")
		if testURL == "" {
			return
		}
		if err := os.Setenv("DATABASE_URL", testURL); err != nil {
			t.Fatalf("set DATABASE_URL: %v", err)
		}
		if err := database.Connect(); err != nil {
			t.Fatalf("connect to TEST_DATABASE_URL: %v", err)
		}
	})
}

func skipIfNoSvcTestDB(t *testing.T) {
	t.Helper()
	initSvcTestDB(t)
	if os.Getenv("TEST_DATABASE_URL") == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
}

func execSvcSQL(t *testing.T, query string, args ...any) {
	t.Helper()
	if _, err := database.GetPool().Exec(context.Background(), query, args...); err != nil {
		t.Fatalf("execSQL: %v", err)
	}
}

func seedSvcAuthUser(t *testing.T, userID string) {
	t.Helper()
	email := fmt.Sprintf("test-%s@example.com", strings.ReplaceAll(userID, "-", "")[:16])
	execSvcSQL(t, `
		INSERT INTO auth.users (
			id, instance_id, aud, role, email, encrypted_password,
			email_confirmed_at, created_at, updated_at
		)
		VALUES ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, '', NOW(), NOW(), NOW())
		ON CONFLICT (id) DO NOTHING
	`, userID, email)
}

func seedSvcTrade(t *testing.T, userID, ticker, quantity, price string) {
	t.Helper()
	id := uuid.New().String()
	total := "0" // total is not read by holdings calculation
	execSvcSQL(t, `
		INSERT INTO trades (
			id, user_id, date, ticker, asset_type, side, is_opening_position,
			quantity, price, deposit_fee, trading_fee, closing_fee, total_fees, total, notes
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
	`, id, userID, time.Now().UTC().Format("2006-01-02"), ticker, "stock", "buy", false,
		quantity, price, "0", "0", "0", "0", total, "test")
	t.Cleanup(func() {
		execSvcSQL(t, "DELETE FROM cash_flows WHERE related_trade_id = $1", id)
		execSvcSQL(t, "DELETE FROM trades WHERE id = $1", id)
	})
}

func seedSvcCashFlow(t *testing.T, userID string, amount string) {
	t.Helper()
	id := uuid.New().String()
	execSvcSQL(t, `
		INSERT INTO cash_flows (
			id, user_id, date, type, currency, amount, usd_amount, notes
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, id, userID, time.Now().UTC().Format("2006-01-02"), "deposit", "USD", amount, amount, "test")
	t.Cleanup(func() {
		execSvcSQL(t, "DELETE FROM cash_flows WHERE id = $1", id)
	})
}

func seedSvcMarketPrice(t *testing.T, ticker, price string) {
	t.Helper()
	execSvcSQL(t, `
		INSERT INTO market_prices (ticker, price, currency, updated_at)
		VALUES ($1, $2, 'USD', NOW())
		ON CONFLICT (ticker) DO UPDATE SET price = $2, updated_at = NOW()
	`, ticker, price)
	t.Cleanup(func() {
		execSvcSQL(t, "DELETE FROM market_prices WHERE ticker = $1", ticker)
	})
}

func TestAnalyticsService_GetCurrentHoldings_isolation(t *testing.T) {
	skipIfNoSvcTestDB(t)

	userA := uuid.New().String()
	userB := uuid.New().String()

	seedSvcMarketPrice(t, "AAPL", "200.00")
	seedSvcTrade(t, userA, "AAPL", "5", "150.00")
	seedSvcTrade(t, userB, "AAPL", "100", "150.00")

	svc := NewAnalyticsService(database.GetPool())
	holdings, err := svc.GetCurrentHoldings(context.Background(), userA)
	if err != nil {
		t.Fatalf("GetCurrentHoldings() error = %v", err)
	}
	if len(holdings) != 1 {
		t.Fatalf("expected 1 holding, got %d", len(holdings))
	}
	if holdings[0].Quantity != "5" {
		t.Errorf("quantity = %q, want 5", holdings[0].Quantity)
	}
}

func TestAnalyticsService_GetNetWorthSummary_isolation(t *testing.T) {
	skipIfNoSvcTestDB(t)

	userA := uuid.New().String()
	userB := uuid.New().String()

	seedSvcMarketPrice(t, "AAPL", "200.00")
	seedSvcTrade(t, userA, "AAPL", "5", "150.00")
	seedSvcCashFlow(t, userB, "50000")

	svc := NewAnalyticsService(database.GetPool())
	summary, err := svc.GetNetWorthSummary(context.Background(), userA)
	if err != nil {
		t.Fatalf("GetNetWorthSummary() error = %v", err)
	}

	// User A has 5 AAPL @ $200 = $1000 holdings value.
	if summary.HoldingsValue != "1000" {
		t.Errorf("holdings value = %q, want 1000", summary.HoldingsValue)
	}
	// User A has no cash flows, so cash balance should be 0 (or negative trade costs).
	if summary.CashBalance == "50000" {
		t.Errorf("cash balance leaked user B deposit: %q", summary.CashBalance)
	}
}
