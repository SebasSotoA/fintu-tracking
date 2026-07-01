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
		execSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userID)
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
		execSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userID)
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
		execSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userID)
		execSQL(t, "DELETE FROM profiles WHERE user_id = $1", userID)
	})
}

func TestUpdateProfile_Unauthorized(t *testing.T) {
	t.Parallel()

	app := fiber.New()
	app.Patch("/me/profile", UpdateProfile)

	resp, err := app.Test(httptest.NewRequest(http.MethodPatch, "/me/profile", nil))
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	assertStatus(t, resp, http.StatusUnauthorized)
}

func TestUpdateProfile_Validation(t *testing.T) {
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
			app.Patch("/me/profile", UpdateProfile)

			req := httptest.NewRequest(http.MethodPatch, "/me/profile", strings.NewReader(tc.body))
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
		execSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userID)
		execSQL(t, "DELETE FROM profiles WHERE user_id = $1", userID)
	})
}

func TestUpdateProfile_Success(t *testing.T) {
	skipIfNoTestDB(t)

	userID := newTestUserID(t)
	InitProfileService(database.GetPool())

	onboardApp := fiber.New()
	onboardApp.Use(withUser(userID))
	onboardApp.Patch("/me/onboarding", UpdateOnboarding)

	onboardReq := httptest.NewRequest(http.MethodPatch, "/me/onboarding", strings.NewReader(`{"country":"co","broker_preset_id":"hapi-colombia"}`))
	onboardReq.Header.Set("Content-Type", "application/json")
	onboardResp, err := onboardApp.Test(onboardReq)
	if err != nil {
		t.Fatalf("onboarding app.Test: %v", err)
	}
	onboardResp.Body.Close()
	assertStatus(t, onboardResp, http.StatusOK)

	app := fiber.New()
	app.Use(withUser(userID))
	app.Patch("/me/profile", UpdateProfile)

	req := httptest.NewRequest(http.MethodPatch, "/me/profile", strings.NewReader(`{"country":"mx","broker_preset_id":"gbm-mexico"}`))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	assertStatus(t, resp, http.StatusOK)
	assertBodyContains(t, resp, `"onboarding_completed":true`)
	assertBodyContains(t, resp, `"broker_preset_id":"gbm-mexico"`)
	assertBodyContains(t, resp, `"country":"mx"`)

	t.Cleanup(func() {
		execSQL(t, "DELETE FROM brokers WHERE user_id = $1", userID)
		execSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userID)
		execSQL(t, "DELETE FROM profiles WHERE user_id = $1", userID)
	})
}

func TestUpdateProfile_isolation(t *testing.T) {
	skipIfNoTestDB(t)

	userA := newTestUserID(t)
	userB := newTestUserID(t)
	InitProfileService(database.GetPool())

	appA := fiber.New()
	appA.Use(withUser(userA))
	appA.Patch("/me/onboarding", UpdateOnboarding)
	appA.Patch("/me/profile", UpdateProfile)

	onboardReq := httptest.NewRequest(http.MethodPatch, "/me/onboarding", strings.NewReader(`{"country":"co","broker_preset_id":"hapi-colombia"}`))
	onboardReq.Header.Set("Content-Type", "application/json")
	onboardResp, err := appA.Test(onboardReq)
	if err != nil {
		t.Fatalf("onboarding app.Test: %v", err)
	}
	onboardResp.Body.Close()

	profileReq := httptest.NewRequest(http.MethodPatch, "/me/profile", strings.NewReader(`{"country":"mx","broker_preset_id":"gbm-mexico"}`))
	profileReq.Header.Set("Content-Type", "application/json")
	profileResp, err := appA.Test(profileReq)
	if err != nil {
		t.Fatalf("profile app.Test: %v", err)
	}
	profileResp.Body.Close()
	assertStatus(t, profileResp, http.StatusOK)

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
	assertBodyContains(t, respB, `"country":"co"`)

	t.Cleanup(func() {
		execSQL(t, "DELETE FROM brokers WHERE user_id = $1", userA)
		execSQL(t, "DELETE FROM profiles WHERE user_id = $1", userA)
		execSQL(t, "DELETE FROM profiles WHERE user_id = $1", userB)
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
