package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"fintu-tracking-backend/internal/database"
	"fintu-tracking-backend/internal/services"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

func TestRequireActivePlan_AllowsActiveSubscription(t *testing.T) {
	skipIfNoTestDB(t)
	userID := uuid.New().String()

	svc := services.NewBillingService(database.GetPool(), services.NewNoOpBillingProvider())
	if _, err := svc.GetOrCreateClosedBetaSubscription(context.Background(), userID); err != nil {
		t.Fatalf("create subscription: %v", err)
	}

	app := fiber.New()
	app.Use(withUser(userID))
	app.Use(RequireActivePlan(svc))
	app.Get("/test", func(c fiber.Ctx) error {
		return c.SendString("ok")
	})

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/test", nil))
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("status = %d, want %d", resp.StatusCode, http.StatusOK)
	}

	t.Cleanup(func() {
		if _, err := database.GetPool().Exec(context.Background(), "DELETE FROM subscriptions WHERE user_id = $1", userID); err != nil {
			t.Fatalf("cleanup: %v", err)
		}
	})
}

func TestRequireActivePlan_BlocksMissingSubscription(t *testing.T) {
	skipIfNoTestDB(t)
	userID := uuid.New().String()

	svc := services.NewBillingService(database.GetPool(), services.NewNoOpBillingProvider())

	app := fiber.New()
	app.Use(withUser(userID))
	app.Use(RequireActivePlan(svc))
	app.Get("/test", func(c fiber.Ctx) error {
		return c.SendString("ok")
	})

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/test", nil))
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusPaymentRequired {
		t.Errorf("status = %d, want %d", resp.StatusCode, http.StatusPaymentRequired)
	}
}

func TestRequireActivePlan_BlocksCanceledSubscription(t *testing.T) {
	skipIfNoTestDB(t)
	userID := uuid.New().String()

	svc := services.NewBillingService(database.GetPool(), services.NewNoOpBillingProvider())
	if _, err := svc.GetOrCreateClosedBetaSubscription(context.Background(), userID); err != nil {
		t.Fatalf("create subscription: %v", err)
	}

	var subID string
	if err := database.GetPool().QueryRow(context.Background(), "SELECT id FROM subscriptions WHERE user_id = $1", userID).Scan(&subID); err != nil {
		t.Fatalf("fetch subscription id: %v", err)
	}
	if _, err := svc.CancelSubscription(context.Background(), userID, subID); err != nil {
		t.Fatalf("cancel subscription: %v", err)
	}

	app := fiber.New()
	app.Use(withUser(userID))
	app.Use(RequireActivePlan(svc))
	app.Get("/test", func(c fiber.Ctx) error {
		return c.SendString("ok")
	})

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/test", nil))
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusPaymentRequired {
		t.Errorf("status = %d, want %d", resp.StatusCode, http.StatusPaymentRequired)
	}

	t.Cleanup(func() {
		if _, err := database.GetPool().Exec(context.Background(), "DELETE FROM subscriptions WHERE user_id = $1", userID); err != nil {
			t.Fatalf("cleanup: %v", err)
		}
	})
}

func withUser(userID string) fiber.Handler {
	return func(c fiber.Ctx) error {
		c.Locals("user_id", userID)
		return c.Next()
	}
}

func skipIfNoTestDB(t *testing.T) {
	t.Helper()
	if database.GetPool() == nil {
		t.Skip("TEST_DATABASE_URL not set or database not connected")
	}
}
