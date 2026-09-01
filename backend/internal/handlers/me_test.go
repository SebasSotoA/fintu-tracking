package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"fintu-tracking-backend/internal/database"
	"fintu-tracking-backend/internal/repositories"
	"fintu-tracking-backend/internal/services"

	"github.com/go-chi/chi/v5"
)

func initProfileServiceForTest(t *testing.T) {
	t.Helper()
	skipIfNoTestDB(t)
	pool := database.GetPool()
	if billingService == nil {
		InitBillingService(services.NewBillingService(
			repositories.NewPostgresBillingRepository(pool),
			services.NewNoOpBillingProvider(),
		))
	}
	brokerSvc := services.NewBrokerService(repositories.NewPostgresBrokerRepository(pool))
	profileSvc := services.NewProfileService(
		repositories.NewPostgresProfileRepository(pool),
		billingService,
		brokerSvc,
	)
	InitProfileService(profileSvc)
}

func TestGetMe_Unauthorized(t *testing.T) {
	t.Parallel()

	app := chi.NewRouter()
	app.Get("/me", GetMe)

	rec := httptest.NewRecorder()
	app.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/me", nil))
	resp := rec.Result()
	defer resp.Body.Close()

	assertStatus(t, resp, http.StatusUnauthorized)
}

func TestGetMe_CreatesProfileForNewUser(t *testing.T) {
	skipIfNoTestDB(t)

	userID := newTestUserID(t)
	initProfileServiceForTest(t)

	app := chi.NewRouter()
	app.Use(withUser(userID))
	app.Get("/me", GetMe)

	rec := httptest.NewRecorder()
	app.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/me", nil))
	resp := rec.Result()
	defer resp.Body.Close()

	assertStatus(t, resp, http.StatusOK)
	body := rec.Body.String()
	if !strings.Contains(body, `"onboarding_completed":false`) {
		t.Errorf("body = %q, want substring %q", body, `"onboarding_completed":false`)
	}
	if !strings.Contains(body, `"country":"co"`) {
		t.Errorf("body = %q, want substring %q", body, `"country":"co"`)
	}
	if !strings.Contains(body, `"locale":null`) {
		t.Errorf("body = %q, want substring %q", body, `"locale":null`)
	}

	t.Cleanup(func() {
		execSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userID)
		execSQL(t, "DELETE FROM profiles WHERE user_id = $1", userID)
	})
}

func TestUpdateOnboarding_Validation(t *testing.T) {
	skipIfNoTestDB(t)

	userID := newTestUserID(t)
	initProfileServiceForTest(t)

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
			app := chi.NewRouter()
			app.Use(withUser(userID))
			app.Patch("/me/onboarding", UpdateOnboarding)

			req := httptest.NewRequest(http.MethodPatch, "/me/onboarding", strings.NewReader(tc.body))
			req.Header.Set("Content-Type", "application/json")

			rec := httptest.NewRecorder()
			app.ServeHTTP(rec, req)
			resp := rec.Result()
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
	initProfileServiceForTest(t)

	app := chi.NewRouter()
	app.Use(withUser(userID))
	app.Patch("/me/onboarding", UpdateOnboarding)

	req := httptest.NewRequest(http.MethodPatch, "/me/onboarding", strings.NewReader(`{"country":"co","broker_preset_id":"hapi-colombia"}`))
	req.Header.Set("Content-Type", "application/json")

	rec := httptest.NewRecorder()
	app.ServeHTTP(rec, req)
	resp := rec.Result()
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

	app := chi.NewRouter()
	app.Patch("/me/profile", UpdateProfile)

	rec := httptest.NewRecorder()
	app.ServeHTTP(rec, httptest.NewRequest(http.MethodPatch, "/me/profile", nil))
	resp := rec.Result()
	defer resp.Body.Close()

	assertStatus(t, resp, http.StatusUnauthorized)
}

func TestUpdateProfile_ValidationWithoutDB(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name  string
		body  string
		error string
	}{
		{
			name:  "missing country",
			body:  `{"broker_preset_id":"hapi-colombia"}`,
			error: "country and broker_preset_id are required",
		},
		{
			name:  "missing broker_preset_id",
			body:  `{"country":"co"}`,
			error: "country and broker_preset_id are required",
		},
		{
			name:  "unknown preset",
			body:  `{"country":"co","broker_preset_id":"unknown"}`,
			error: "Unknown broker preset",
		},
		{
			name:  "invalid locale",
			body:  `{"locale":"fr"}`,
			error: "invalid locale",
		},
		{
			name:  "uppercase locale rejected",
			body:  `{"locale":"EN"}`,
			error: "invalid locale",
		},
		{
			name:  "empty locale rejected",
			body:  `{"locale":""}`,
			error: "invalid locale",
		},
		{
			name:  "empty body",
			body:  `{}`,
			error: "locale, or country and broker_preset_id, is required",
		},
		{
			name:  "invalid locale with country and broker",
			body:  `{"country":"co","broker_preset_id":"hapi-colombia","locale":"fr"}`,
			error: "invalid locale",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			app := chi.NewRouter()
			app.Use(withUser("user-1"))
			app.Patch("/me/profile", UpdateProfile)

			req := httptest.NewRequest(http.MethodPatch, "/me/profile", strings.NewReader(tc.body))
			req.Header.Set("Content-Type", "application/json")

			rec := httptest.NewRecorder()
			app.ServeHTTP(rec, req)
			resp := rec.Result()
			defer resp.Body.Close()

			assertStatus(t, resp, http.StatusBadRequest)
			assertBodyContains(t, resp, tc.error)
		})
	}
}

func TestUpdateProfile_Validation(t *testing.T) {
	skipIfNoTestDB(t)

	userID := newTestUserID(t)
	initProfileServiceForTest(t)

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
		{
			name:  "invalid locale",
			body:  `{"locale":"fr"}`,
			want:  http.StatusBadRequest,
			error: "invalid locale",
		},
		{
			name:  "uppercase locale rejected",
			body:  `{"locale":"EN"}`,
			want:  http.StatusBadRequest,
			error: "invalid locale",
		},
		{
			name:  "empty locale rejected",
			body:  `{"locale":""}`,
			want:  http.StatusBadRequest,
			error: "invalid locale",
		},
		{
			name:  "empty body",
			body:  `{}`,
			want:  http.StatusBadRequest,
			error: "locale, or country and broker_preset_id, is required",
		},
		{
			name:  "invalid locale with country and broker",
			body:  `{"country":"co","broker_preset_id":"hapi-colombia","locale":"fr"}`,
			want:  http.StatusBadRequest,
			error: "invalid locale",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			app := chi.NewRouter()
			app.Use(withUser(userID))
			app.Patch("/me/profile", UpdateProfile)

			req := httptest.NewRequest(http.MethodPatch, "/me/profile", strings.NewReader(tc.body))
			req.Header.Set("Content-Type", "application/json")

			rec := httptest.NewRecorder()
			app.ServeHTTP(rec, req)
			resp := rec.Result()
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
	initProfileServiceForTest(t)

	onboardApp := chi.NewRouter()
	onboardApp.Use(withUser(userID))
	onboardApp.Patch("/me/onboarding", UpdateOnboarding)

	onboardReq := httptest.NewRequest(http.MethodPatch, "/me/onboarding", strings.NewReader(`{"country":"co","broker_preset_id":"hapi-colombia"}`))
	onboardReq.Header.Set("Content-Type", "application/json")
	onboardRec := httptest.NewRecorder()
	onboardApp.ServeHTTP(onboardRec, onboardReq)
	onboardResp := onboardRec.Result()
	onboardResp.Body.Close()
	assertStatus(t, onboardResp, http.StatusOK)

	app := chi.NewRouter()
	app.Use(withUser(userID))
	app.Patch("/me/profile", UpdateProfile)

	req := httptest.NewRequest(http.MethodPatch, "/me/profile", strings.NewReader(`{"country":"mx","broker_preset_id":"gbm-mexico"}`))
	req.Header.Set("Content-Type", "application/json")

	rec := httptest.NewRecorder()
	app.ServeHTTP(rec, req)
	resp := rec.Result()
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

func TestUpdateProfile_LocaleOnly_Success(t *testing.T) {
	skipIfNoTestDB(t)

	userID := newTestUserID(t)
	initProfileServiceForTest(t)

	app := chi.NewRouter()
	app.Use(withUser(userID))
	app.Get("/me", GetMe)
	app.Patch("/me/profile", UpdateProfile)

	req := httptest.NewRequest(http.MethodPatch, "/me/profile", strings.NewReader(`{"locale":"es"}`))
	req.Header.Set("Content-Type", "application/json")

	rec := httptest.NewRecorder()
	app.ServeHTTP(rec, req)
	resp := rec.Result()
	defer resp.Body.Close()

	assertStatus(t, resp, http.StatusOK)
	body := rec.Body.String()
	if !strings.Contains(body, `"locale":"es"`) {
		t.Errorf("body = %q, want substring %q", body, `"locale":"es"`)
	}
	if !strings.Contains(body, `"onboarding_completed":false`) {
		t.Errorf("body = %q, want substring %q", body, `"onboarding_completed":false`)
	}

	getRec := httptest.NewRecorder()
	app.ServeHTTP(getRec, httptest.NewRequest(http.MethodGet, "/me", nil))
	getResp := getRec.Result()
	defer getResp.Body.Close()

	assertStatus(t, getResp, http.StatusOK)
	getBody := getRec.Body.String()
	if !strings.Contains(getBody, `"locale":"es"`) {
		t.Errorf("GET body = %q, want substring %q", getBody, `"locale":"es"`)
	}
	if !strings.Contains(getBody, `"onboarding_completed":false`) {
		t.Errorf("GET body = %q, want substring %q", getBody, `"onboarding_completed":false`)
	}

	t.Cleanup(func() {
		execSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userID)
		execSQL(t, "DELETE FROM profiles WHERE user_id = $1", userID)
	})
}

func TestUpdateProfile_LocaleOnly_English(t *testing.T) {
	skipIfNoTestDB(t)

	userID := newTestUserID(t)
	initProfileServiceForTest(t)

	app := chi.NewRouter()
	app.Use(withUser(userID))
	app.Patch("/me/profile", UpdateProfile)

	req := httptest.NewRequest(http.MethodPatch, "/me/profile", strings.NewReader(`{"locale":"en"}`))
	req.Header.Set("Content-Type", "application/json")

	rec := httptest.NewRecorder()
	app.ServeHTTP(rec, req)
	resp := rec.Result()
	defer resp.Body.Close()

	assertStatus(t, resp, http.StatusOK)
	assertBodyContains(t, resp, `"locale":"en"`)

	t.Cleanup(func() {
		execSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userID)
		execSQL(t, "DELETE FROM profiles WHERE user_id = $1", userID)
	})
}

func TestUpdateProfile_CountryBroker_OptionallySetsLocale(t *testing.T) {
	skipIfNoTestDB(t)

	userID := newTestUserID(t)
	initProfileServiceForTest(t)

	onboardApp := chi.NewRouter()
	onboardApp.Use(withUser(userID))
	onboardApp.Patch("/me/onboarding", UpdateOnboarding)

	onboardReq := httptest.NewRequest(http.MethodPatch, "/me/onboarding", strings.NewReader(`{"country":"co","broker_preset_id":"hapi-colombia"}`))
	onboardReq.Header.Set("Content-Type", "application/json")
	onboardRec := httptest.NewRecorder()
	onboardApp.ServeHTTP(onboardRec, onboardReq)
	onboardResp := onboardRec.Result()
	onboardResp.Body.Close()
	assertStatus(t, onboardResp, http.StatusOK)

	app := chi.NewRouter()
	app.Use(withUser(userID))
	app.Patch("/me/profile", UpdateProfile)

	req := httptest.NewRequest(http.MethodPatch, "/me/profile", strings.NewReader(`{"country":"mx","broker_preset_id":"gbm-mexico","locale":"es"}`))
	req.Header.Set("Content-Type", "application/json")

	rec := httptest.NewRecorder()
	app.ServeHTTP(rec, req)
	resp := rec.Result()
	defer resp.Body.Close()

	assertStatus(t, resp, http.StatusOK)
	body := rec.Body.String()
	if !strings.Contains(body, `"country":"mx"`) {
		t.Errorf("body = %q, want substring %q", body, `"country":"mx"`)
	}
	if !strings.Contains(body, `"broker_preset_id":"gbm-mexico"`) {
		t.Errorf("body = %q, want substring %q", body, `"broker_preset_id":"gbm-mexico"`)
	}
	if !strings.Contains(body, `"locale":"es"`) {
		t.Errorf("body = %q, want substring %q", body, `"locale":"es"`)
	}
	if !strings.Contains(body, `"onboarding_completed":true`) {
		t.Errorf("body = %q, want substring %q", body, `"onboarding_completed":true`)
	}

	t.Cleanup(func() {
		execSQL(t, "DELETE FROM brokers WHERE user_id = $1", userID)
		execSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userID)
		execSQL(t, "DELETE FROM profiles WHERE user_id = $1", userID)
	})
}

func TestUpdateProfile_LocaleOnly_isolation(t *testing.T) {
	skipIfNoTestDB(t)

	userA := newTestUserID(t)
	userB := newTestUserID(t)
	initProfileServiceForTest(t)

	appA := chi.NewRouter()
	appA.Use(withUser(userA))
	appA.Patch("/me/profile", UpdateProfile)

	reqA := httptest.NewRequest(http.MethodPatch, "/me/profile", strings.NewReader(`{"locale":"es"}`))
	reqA.Header.Set("Content-Type", "application/json")
	recA := httptest.NewRecorder()
	appA.ServeHTTP(recA, reqA)
	respA := recA.Result()
	respA.Body.Close()
	assertStatus(t, respA, http.StatusOK)

	appB := chi.NewRouter()
	appB.Use(withUser(userB))
	appB.Get("/me", GetMe)

	recB := httptest.NewRecorder()
	appB.ServeHTTP(recB, httptest.NewRequest(http.MethodGet, "/me", nil))
	respB := recB.Result()
	defer respB.Body.Close()

	assertStatus(t, respB, http.StatusOK)
	assertBodyContains(t, respB, `"locale":null`)

	t.Cleanup(func() {
		execSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userA)
		execSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userB)
		execSQL(t, "DELETE FROM profiles WHERE user_id = $1", userA)
		execSQL(t, "DELETE FROM profiles WHERE user_id = $1", userB)
	})
}

func TestUpdateProfile_isolation(t *testing.T) {
	skipIfNoTestDB(t)

	userA := newTestUserID(t)
	userB := newTestUserID(t)
	initProfileServiceForTest(t)

	appA := chi.NewRouter()
	appA.Use(withUser(userA))
	appA.Patch("/me/onboarding", UpdateOnboarding)
	appA.Patch("/me/profile", UpdateProfile)

	onboardReq := httptest.NewRequest(http.MethodPatch, "/me/onboarding", strings.NewReader(`{"country":"co","broker_preset_id":"hapi-colombia"}`))
	onboardReq.Header.Set("Content-Type", "application/json")
	onboardRec := httptest.NewRecorder()
	appA.ServeHTTP(onboardRec, onboardReq)
	onboardResp := onboardRec.Result()
	onboardResp.Body.Close()

	profileReq := httptest.NewRequest(http.MethodPatch, "/me/profile", strings.NewReader(`{"country":"mx","broker_preset_id":"gbm-mexico"}`))
	profileReq.Header.Set("Content-Type", "application/json")
	profileRec := httptest.NewRecorder()
	appA.ServeHTTP(profileRec, profileReq)
	profileResp := profileRec.Result()
	profileResp.Body.Close()
	assertStatus(t, profileResp, http.StatusOK)

	appB := chi.NewRouter()
	appB.Use(withUser(userB))
	appB.Get("/me", GetMe)

	recB := httptest.NewRecorder()
	appB.ServeHTTP(recB, httptest.NewRequest(http.MethodGet, "/me", nil))
	respB := recB.Result()
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
	initProfileServiceForTest(t)

	// Complete onboarding as user A.
	appA := chi.NewRouter()
	appA.Use(withUser(userA))
	appA.Patch("/me/onboarding", UpdateOnboarding)

	reqA := httptest.NewRequest(http.MethodPatch, "/me/onboarding", strings.NewReader(`{"country":"co","broker_preset_id":"hapi-colombia"}`))
	reqA.Header.Set("Content-Type", "application/json")

	recA := httptest.NewRecorder()
	appA.ServeHTTP(recA, reqA)
	respA := recA.Result()
	respA.Body.Close()
	assertStatus(t, respA, http.StatusOK)

	// Fetch profile as user B; it should not be completed.
	appB := chi.NewRouter()
	appB.Use(withUser(userB))
	appB.Get("/me", GetMe)

	recB := httptest.NewRecorder()
	appB.ServeHTTP(recB, httptest.NewRequest(http.MethodGet, "/me", nil))
	respB := recB.Result()
	defer respB.Body.Close()

	assertStatus(t, respB, http.StatusOK)
	assertBodyContains(t, respB, `"onboarding_completed":false`)

	t.Cleanup(func() {
		execSQL(t, "DELETE FROM profiles WHERE user_id = $1", userA)
		execSQL(t, "DELETE FROM profiles WHERE user_id = $1", userB)
	})
}
