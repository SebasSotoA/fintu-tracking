package handlers

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"fintu-tracking-backend/internal/database"
	"fintu-tracking-backend/internal/services"

	"github.com/gofiber/fiber/v3"
)

func TestListPlans_Unauthorized(t *testing.T) {
	t.Parallel()
	app := fiber.New()
	app.Get("/plans", ListPlans)

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/plans", nil))
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	assertStatus(t, resp, http.StatusUnauthorized)
}

func TestGetSubscription_Unauthorized(t *testing.T) {
	t.Parallel()
	app := fiber.New()
	app.Get("/subscriptions/current", GetSubscription)

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/subscriptions/current", nil))
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	assertStatus(t, resp, http.StatusUnauthorized)
}

func TestGetSubscription_ReturnsClosedBeta(t *testing.T) {
	skipIfNoTestDB(t)
	userID := newTestUserID(t)

	billingSvc := services.NewBillingService(database.GetPool(), services.NewNoOpBillingProvider())
	InitBillingService(billingSvc)

	app := fiber.New()
	app.Use(withUser(userID))
	app.Get("/subscriptions/current", GetSubscription)

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/subscriptions/current", nil))
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	assertStatus(t, resp, http.StatusOK)
	body, _ := io.ReadAll(resp.Body)
	if !strings.Contains(string(body), "closed_beta") {
		t.Errorf("body = %q, want closed_beta", string(body))
	}

	t.Cleanup(func() {
		execSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userID)
	})
}

func TestCreateSubscription_ValidationErrors(t *testing.T) {
	skipIfNoTestDB(t)
	userID := newTestUserID(t)

	billingSvc := services.NewBillingService(database.GetPool(), services.NewNoOpBillingProvider())
	InitBillingService(billingSvc)

	app := fiber.New()
	app.Use(withUser(userID))
	app.Post("/subscriptions", CreateSubscription)

	req := httptest.NewRequest(http.MethodPost, "/subscriptions", strings.NewReader(`{"plan_id":""}`))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	assertStatus(t, resp, http.StatusBadRequest)
}

func TestCreateSubscription_Isolation(t *testing.T) {
	skipIfNoTestDB(t)
	userA := newTestUserID(t)
	userB := newTestUserID(t)

	billingSvc := services.NewBillingService(database.GetPool(), services.NewNoOpBillingProvider())
	InitBillingService(billingSvc)

	// Create subscription for user A first.
	if _, err := billingSvc.GetOrCreateClosedBetaSubscription(context.Background(), userA); err != nil {
		t.Fatalf("create subscription A: %v", err)
	}

	app := fiber.New()
	app.Use(withUser(userB))
	app.Post("/subscriptions", CreateSubscription)

	body := bytes.NewReader([]byte(`{"plan_id":"pro_monthly","billing_provider":"manual"}`))
	req := httptest.NewRequest(http.MethodPost, "/subscriptions", body)
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	// UserB should be able to create their own subscription; userA's subscription is untouched.
	assertStatus(t, resp, http.StatusCreated)

	t.Cleanup(func() {
		execSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userA)
		execSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userB)
	})
}

func TestCancelSubscription_Success(t *testing.T) {
	skipIfNoTestDB(t)
	userID := newTestUserID(t)

	billingSvc := services.NewBillingService(database.GetPool(), services.NewNoOpBillingProvider())
	InitBillingService(billingSvc)

	if _, err := billingSvc.GetOrCreateClosedBetaSubscription(context.Background(), userID); err != nil {
		t.Fatalf("create subscription: %v", err)
	}

	var subID string
	if err := database.GetPool().QueryRow(context.Background(), "SELECT id FROM subscriptions WHERE user_id = $1", userID).Scan(&subID); err != nil {
		t.Fatalf("fetch subscription id: %v", err)
	}

	app := fiber.New()
	app.Use(withUser(userID))
	app.Patch("/subscriptions/:id/cancel", CancelSubscription)

	resp, err := app.Test(httptest.NewRequest(http.MethodPatch, "/subscriptions/"+subID+"/cancel", nil))
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	assertStatus(t, resp, http.StatusOK)
	body, _ := io.ReadAll(resp.Body)
	if !strings.Contains(string(body), "canceled") {
		t.Errorf("body = %q, want canceled", string(body))
	}

	t.Cleanup(func() {
		execSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userID)
	})
}
