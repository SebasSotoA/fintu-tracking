package handlers

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"fintu-tracking-backend/internal/database"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

func seedBroker(t *testing.T, userID, presetID string) string {
	t.Helper()

	if brokerService == nil {
		skipIfNoTestDB(t)
		InitBrokerService(database.GetPool())
	}

	broker, err := brokerService.GetOrCreateBrokerFromPreset(context.Background(), userID, presetID)
	if err != nil {
		t.Fatalf("seedBroker: %v", err)
	}
	t.Cleanup(func() {
		execSQL(t, "DELETE FROM brokers WHERE id = $1", broker.ID)
	})
	return broker.ID
}

func TestListBrokers_Unauthorized(t *testing.T) {
	t.Parallel()

	app := fiber.New()
	app.Get("/brokers", ListBrokers)

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/brokers", nil))
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	assertStatus(t, resp, http.StatusUnauthorized)
	assertBodyContains(t, resp, "Unauthorized")
}

func TestCreateBroker_Unauthorized(t *testing.T) {
	t.Parallel()

	app := fiber.New()
	app.Post("/brokers", CreateBroker)

	req := httptest.NewRequest(http.MethodPost, "/brokers", strings.NewReader(`{"preset_id":"hapi-colombia"}`))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	assertStatus(t, resp, http.StatusUnauthorized)
	assertBodyContains(t, resp, "Unauthorized")
}

func TestCreateBroker_Validation(t *testing.T) {
	skipIfNoTestDB(t)

	userID := newTestUserID(t)
	InitBrokerService(database.GetPool())

	cases := []struct {
		name  string
		body  string
		want  int
		error string
	}{
		{
			name:  "missing preset_id",
			body:  `{}`,
			want:  http.StatusBadRequest,
			error: "preset_id is required",
		},
		{
			name:  "unknown preset",
			body:  `{"preset_id":"unknown"}`,
			want:  http.StatusBadRequest,
			error: "Unknown preset",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			app := fiber.New()
			app.Use(withUser(userID))
			app.Post("/brokers", CreateBroker)

			req := httptest.NewRequest(http.MethodPost, "/brokers", strings.NewReader(tc.body))
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
}

func TestCreateBroker_Success(t *testing.T) {
	skipIfNoTestDB(t)

	userID := newTestUserID(t)
	InitBrokerService(database.GetPool())

	app := fiber.New()
	app.Use(withUser(userID))
	app.Post("/brokers", CreateBroker)

	req := httptest.NewRequest(http.MethodPost, "/brokers", strings.NewReader(`{"preset_id":"hapi-colombia"}`))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	assertStatus(t, resp, http.StatusCreated)

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read body: %v", err)
	}

	var broker map[string]any
	if err := json.Unmarshal(body, &broker); err != nil {
		t.Fatalf("unmarshal body: %v", err)
	}
	if broker["preset_id"] != "hapi-colombia" {
		t.Errorf("preset_id = %q, want %q", broker["preset_id"], "hapi-colombia")
	}
	if broker["name"] != "Hapi" {
		t.Errorf("name = %q, want %q", broker["name"], "Hapi")
	}

	t.Cleanup(func() {
		if id, ok := broker["id"].(string); ok {
			execSQL(t, "DELETE FROM brokers WHERE id = $1", id)
		}
	})
}

func TestListBrokers_ReturnsUserBrokersAndPresets(t *testing.T) {
	skipIfNoTestDB(t)

	userID := newTestUserID(t)
	InitBrokerService(database.GetPool())
	seedBroker(t, userID, "hapi-colombia")

	app := fiber.New()
	app.Use(withUser(userID))
	app.Get("/brokers", ListBrokers)

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/brokers", nil))
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	assertStatus(t, resp, http.StatusOK)

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read body: %v", err)
	}

	var payload struct {
		Brokers []map[string]any `json:"brokers"`
		Presets []map[string]any `json:"presets"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatalf("unmarshal body: %v", err)
	}
	if len(payload.Brokers) != 1 {
		t.Errorf("brokers count = %d, want 1", len(payload.Brokers))
	}
	if payload.Brokers[0]["preset_id"] != "hapi-colombia" {
		t.Errorf("broker preset_id = %q, want %q", payload.Brokers[0]["preset_id"], "hapi-colombia")
	}
	if len(payload.Presets) == 0 {
		t.Error("expected at least one preset")
	}
}

func TestListBrokers_isolation(t *testing.T) {
	skipIfNoTestDB(t)

	userA := newTestUserID(t)
	userB := uuid.New().String()
	InitBrokerService(database.GetPool())
	seedBroker(t, userA, "hapi-colombia")

	app := fiber.New()
	app.Use(withUser(userB))
	app.Get("/brokers", ListBrokers)

	resp, err := app.Test(httptest.NewRequest(http.MethodGet, "/brokers", nil))
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	defer resp.Body.Close()

	assertStatus(t, resp, http.StatusOK)

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read body: %v", err)
	}

	var payload struct {
		Brokers []map[string]any `json:"brokers"`
		Presets []map[string]any `json:"presets"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		t.Fatalf("unmarshal body: %v", err)
	}
	if len(payload.Brokers) != 0 {
		t.Errorf("userB saw %d brokers, want 0", len(payload.Brokers))
	}
}
