package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"fintu-tracking-backend/internal/database"

	"github.com/gofiber/fiber/v3"
)

func TestGetMe_Unauthorized(t *testing.T) {
	t.Parallel()

	app := fiber.New()
	app.Get("/me", GetMe)

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/me", nil))
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	assertStatus(t, resp, http.StatusUnauthorized)
}

func TestGetMe_CreatesProfileForNewUser(t *testing.T) {
	skipIfNoTestDB(t)

	userID := newTestUserID(t)
	InitProfileService(database.GetPool())

	app := fiber.New()
	app.Use(withUser(userID))
	app.Get("/me", GetMe)

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/me", nil))
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	assertStatus(t, resp, http.StatusOK)
	assertBodyContains(t, resp, `"onboarding_completed":false`)
	assertBodyContains(t, resp, `"country":"co"`)

	t.Cleanup(func() {
		execSQL(t, "DELETE FROM profiles WHERE user_id = $1", userID)
	})
}

func TestUpdateOnboarding_Validation(t *testing.T) {
	skipIfNoTestDB(t)

	userID := newTestUserID(t)
	InitProfileService(database.GetPool())

	cases := []struct {
		name  string
		body  string
		want  int
		error string
	}{
		{
			name:  "missing country",
			body:  `{"broker_preset_id":"hapi-colombia"}`,
			want:  http.StatusBadRequest,
			error: "country and broker_preset_id are required",
		},
		{
			name:  "missing broker_preset_id",
			body:  `{"country":"co"}`,
			want:  http.StatusBadRequest,
			error: "country and broker_preset_id are required",
		},
		{
			name:  "unknown preset",
			body:  `{"country":"co","broker_preset_id":"unknown"}`,
			want:  http.StatusBadRequest,
			error: "Unknown broker preset",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			app := fiber.New()
			app.Use(withUser(userID))
			app.Patch("/me/onboarding", UpdateOnboarding)

			req := httptest.NewRequest(http.MethodPatch, "/me/onboarding", strings.NewReader(tc.body))
			req.Header.Set("Content-Type", "application/json")

			resp, err := app.Test(req)
			if err != nil {
				t.Fatalf("app.Test: %v", err)
			}
			defer resp.Body.Close()

			assertStatus(t, resp, tc.want)
			assertBodyContains(t, resp, tc.error)
		})
	}

	t.Cleanup(func() {
		execSQL(t, "DELETE FROM profiles WHERE user_id = $1", userID)
	})
}

func TestUpdateOnboarding_Success(t *testing.T) {
	skipIfNoTestDB(t)

	userID := newTestUserID(t)
	InitProfileService(database.GetPool())

	app := fiber.New()
	app.Use(withUser(userID))
	app.Patch("/me/onboarding", UpdateOnboarding)

	req := httptest.NewRequest(http.MethodPatch, "/me/onboarding", strings.NewReader(`{"country":"co","broker_preset_id":"hapi-colombia"}`))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	assertStatus(t, resp, http.StatusOK)
	assertBodyContains(t, resp, `"onboarding_completed":true`)
	assertBodyContains(t, resp, `"broker_preset_id":"hapi-colombia"`)
	assertBodyContains(t, resp, `"country":"co"`)

	t.Cleanup(func() {
		execSQL(t, "DELETE FROM profiles WHERE user_id = $1", userID)
	})
}

func TestUpdateOnboarding_isolation(t *testing.T) {
	skipIfNoTestDB(t)

	userA := newTestUserID(t)
	userB := newTestUserID(t)
	InitProfileService(database.GetPool())

	// Complete onboarding as user A.
	appA := fiber.New()
	appA.Use(withUser(userA))
	appA.Patch("/me/onboarding", UpdateOnboarding)

	reqA := httptest.NewRequest(http.MethodPatch, "/me/onboarding", strings.NewReader(`{"country":"co","broker_preset_id":"hapi-colombia"}`))
	reqA.Header.Set("Content-Type", "application/json")

	respA, err := appA.Test(reqA)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	respA.Body.Close()
	assertStatus(t, respA, http.StatusOK)

	// Fetch profile as user B; it should not be completed.
	appB := fiber.New()
	appB.Use(withUser(userB))
	appB.Get("/me", GetMe)

	respB, err := appB.Test(httptest.NewRequest(http.MethodGet, "/me", nil))
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer respB.Body.Close()

	assertStatus(t, respB, http.StatusOK)
	assertBodyContains(t, respB, `"onboarding_completed":false`)

	t.Cleanup(func() {
		execSQL(t, "DELETE FROM profiles WHERE user_id = $1", userA)
		execSQL(t, "DELETE FROM profiles WHERE user_id = $1", userB)
	})
}

