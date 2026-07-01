package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"fintu-tracking-backend/internal/database"
	"fintu-tracking-backend/internal/models"
	"fintu-tracking-backend/internal/services"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

var testDBOnce sync.Once

func initTestDB(t *testing.T) {
	t.Helper()
	testDBOnce.Do(func() {
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

func skipIfNoTestDB(t *testing.T) {
	t.Helper()
	initTestDB(t)
	if os.Getenv("TEST_DATABASE_URL") == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
}

func newTestUserID(t *testing.T) string {
	t.Helper()
	userID := uuid.New().String()
	seedAuthUser(t, userID)
	t.Cleanup(func() {
		execSQL(t, "DELETE FROM auth.users WHERE id = $1", userID)
	})
	return userID
}

func seedAuthUser(t *testing.T, userID string) {
	t.Helper()
	email := fmt.Sprintf("test-%s@example.com", strings.ReplaceAll(userID, "-", "")[:16])
	execSQL(t, `
		INSERT INTO auth.users (
			id, instance_id, aud, role, email, encrypted_password,
			email_confirmed_at, created_at, updated_at
		)
		VALUES ($1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $2, '', NOW(), NOW(), NOW())
		ON CONFLICT (id) DO NOTHING
	`, userID, email)
}

func execSQL(t *testing.T, query string, args ...any) {
	t.Helper()
	if _, err := database.GetPool().Exec(context.Background(), query, args...); err != nil {
		t.Fatalf("execSQL: %v", err)
	}
}

func seedTrade(t *testing.T, userID, ticker string) string {
	t.Helper()
	id := uuid.New().String()
	execSQL(t, `
		INSERT INTO trades (
			id, user_id, date, ticker, asset_type, side, is_opening_position,
			quantity, price, deposit_fee, trading_fee, closing_fee, total_fees, total, notes
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
	`, id, userID, time.Now().UTC().Format("2006-01-02"), ticker, "stock", "buy", false,
		"10", "150.00", "0", "0", "0", "0", "1500.00", "test trade")
	t.Cleanup(func() {
		execSQL(t, "DELETE FROM cash_flows WHERE related_trade_id = $1", id)
		execSQL(t, "DELETE FROM trades WHERE id = $1", id)
	})
	return id
}

func seedCashFlow(t *testing.T, userID string) string {
	t.Helper()
	id := uuid.New().String()
	execSQL(t, `
		INSERT INTO cash_flows (
			id, user_id, date, type, currency, amount, usd_amount, notes
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, id, userID, time.Now().UTC().Format("2006-01-02"), "deposit", "COP", "1000000", "1000", "test cash flow")
	t.Cleanup(func() {
		execSQL(t, "DELETE FROM cash_flows WHERE id = $1", id)
	})
	return id
}

func seedFxRate(t *testing.T, userID string) string {
	t.Helper()
	id := uuid.New().String()
	execSQL(t, `
		INSERT INTO fx_rates (id, user_id, date, rate, source)
		VALUES ($1, $2, $3, $4, $5)
	`, id, userID, time.Now().UTC().Format("2006-01-02"), "4200.0000", "manual")
	t.Cleanup(func() {
		execSQL(t, "DELETE FROM fx_rates WHERE id = $1", id)
	})
	return id
}

func withUser(userID string) fiber.Handler {
	return func(c fiber.Ctx) error {
		c.Locals("user_id", userID)
		return c.Next()
	}
}

func assertStatus(t *testing.T, resp *http.Response, want int) {
	t.Helper()
	if resp.StatusCode != want {
		t.Errorf("status = %d, want %d", resp.StatusCode, want)
	}
}

func assertBodyContains(t *testing.T, resp *http.Response, want string) {
	t.Helper()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read body: %v", err)
	}
	if !strings.Contains(string(body), want) {
		t.Errorf("body = %q, want substring %q", string(body), want)
	}
}

func jsonLen(t *testing.T, resp *http.Response) int {
	t.Helper()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read body: %v", err)
	}
	var arr []map[string]any
	if err := json.Unmarshal(body, &arr); err != nil {
		t.Fatalf("unmarshal body: %v", err)
	}
	return len(arr)
}

func TestListTrades_isolation(t *testing.T) {
	skipIfNoTestDB(t)

	userA := newTestUserID(t)
	userB := newTestUserID(t)
	seedTrade(t, userA, "AAPL")
	seedTrade(t, userB, "MSFT")

	app := fiber.New()
	app.Use(withUser(userA))
	app.Get("/trades", ListTrades)

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/trades", nil))
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	assertStatus(t, resp, http.StatusOK)
	if got := jsonLen(t, resp); got != 1 {
		t.Errorf("returned %d trades, want 1", got)
	}
}

func TestUpdateTrade_isolation(t *testing.T) {
	skipIfNoTestDB(t)

	userA := newTestUserID(t)
	userB := newTestUserID(t)
	tradeB := seedTrade(t, userB, "TSLA")

	app := fiber.New()
	app.Use(withUser(userA))
	app.Put("/trades/:id", UpdateTrade)

	body := fmt.Sprintf(`{"date":"%s","price":"200.00"}`, time.Now().UTC().Format("2006-01-02"))
	req := httptest.NewRequest(http.MethodPut, "/trades/"+tradeB, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	assertStatus(t, resp, http.StatusNotFound)
	assertBodyContains(t, resp, "Trade not found")
}

func TestDeleteCashFlow_isolation(t *testing.T) {
	skipIfNoTestDB(t)

	userA := newTestUserID(t)
	userB := newTestUserID(t)
	cashFlowB := seedCashFlow(t, userB)

	app := fiber.New()
	app.Use(withUser(userA))
	app.Delete("/cash-flows/:id", DeleteCashFlow)

	resp, err := app.Test(httptest.NewRequest(http.MethodDelete, "/cash-flows/"+cashFlowB, nil))
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	assertStatus(t, resp, http.StatusNotFound)
	assertBodyContains(t, resp, "Cash flow not found")
}

func TestListFxRates_isolation(t *testing.T) {
	skipIfNoTestDB(t)

	userA := newTestUserID(t)
	userB := newTestUserID(t)
	seedFxRate(t, userA)
	seedFxRate(t, userB)

	app := fiber.New()
	app.Use(withUser(userA))
	app.Get("/fx-rates", ListFxRates)

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/fx-rates", nil))
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	assertStatus(t, resp, http.StatusOK)
	if got := jsonLen(t, resp); got != 1 {
		t.Errorf("returned %d fx rates, want 1", got)
	}
}

func TestActivityFeed_isolation(t *testing.T) {
	skipIfNoTestDB(t)

	userA := newTestUserID(t)
	userB := newTestUserID(t)
	seedTrade(t, userA, "AAPL")
	seedCashFlow(t, userB)

	app := fiber.New()
	app.Use(withUser(userA))
	app.Get("/activity/feed", GetActivityFeed)

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/activity/feed", nil))
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	assertStatus(t, resp, http.StatusOK)
	if got := jsonLen(t, resp); got != 1 {
		t.Errorf("returned %d activity items, want 1", got)
	}
}

func seedSubscription(t *testing.T, userID string) string {
	t.Helper()
	id := uuid.New().String()
	execSQL(t, `
		INSERT INTO subscriptions (id, user_id, plan_id, status, billing_provider)
		VALUES ($1, $2, $3, $4, $5)
	`, id, userID, models.PlanIDClosedBeta, models.SubscriptionStatusActive, models.BillingProviderManual)
	t.Cleanup(func() {
		execSQL(t, "DELETE FROM subscriptions WHERE id = $1", id)
	})
	return id
}

func TestGetSubscription_isolation(t *testing.T) {
	skipIfNoTestDB(t)

	userA := newTestUserID(t)
	userB := newTestUserID(t)
	subA := seedSubscription(t, userA)

	billingSvc := services.NewBillingService(database.GetPool(), services.NewNoOpBillingProvider())
	InitBillingService(billingSvc)

	app := fiber.New()
	app.Use(withUser(userB))
	app.Get("/subscriptions/current", GetSubscription)

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/subscriptions/current", nil))
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	assertStatus(t, resp, http.StatusNotFound)
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read body: %v", err)
	}
	if strings.Contains(string(body), subA) {
		t.Errorf("body leaked userA subscription id %q", subA)
	}
}

func TestCancelSubscription_isolation(t *testing.T) {
	skipIfNoTestDB(t)

	userA := newTestUserID(t)
	userB := newTestUserID(t)
	subA := seedSubscription(t, userA)

	billingSvc := services.NewBillingService(database.GetPool(), services.NewNoOpBillingProvider())
	InitBillingService(billingSvc)

	app := fiber.New()
	app.Use(withUser(userB))
	app.Patch("/subscriptions/:id/cancel", CancelSubscription)

	resp, err := app.Test(httptest.NewRequest(http.MethodPatch, "/subscriptions/"+subA+"/cancel", nil))
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	assertStatus(t, resp, http.StatusNotFound)
	assertBodyContains(t, resp, "subscription not found")
}

func TestRefreshMarketPrices_cooldownIsPerUser(t *testing.T) {
	skipIfNoTestDB(t)

	userA := newTestUserID(t)
	userB := newTestUserID(t)

	execSQL(t, `
		INSERT INTO market_price_refresh_log (user_id, refreshed_at)
		VALUES ($1, NOW())
		ON CONFLICT (user_id) DO UPDATE SET refreshed_at = NOW()
	`, userA)
	t.Cleanup(func() {
		execSQL(t, "DELETE FROM market_price_refresh_log WHERE user_id = $1", userA)
		execSQL(t, "DELETE FROM market_price_refresh_log WHERE user_id = $1", userB)
	})

	app := fiber.New()
	app.Use(withUser(userB))
	app.Post("/market-prices/refresh", RefreshMarketPrices)

	resp, err := app.Test(httptest.NewRequest(http.MethodPost, "/market-prices/refresh", nil))
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	assertStatus(t, resp, http.StatusOK)
}
