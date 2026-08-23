package handlers

import (
	"encoding/json"
	"net/http"

	"fintu-tracking-backend/internal/config"
	"fintu-tracking-backend/internal/httpx"
	"fintu-tracking-backend/internal/middleware"
	"fintu-tracking-backend/internal/services"

	"github.com/jackc/pgx/v5/pgxpool"
)

// InitBrokerService sets the package-level broker service used by handlers.
// It is called once from main.go after the DB pool is available.
func InitBrokerService(pool *pgxpool.Pool) {
	brokerService = services.NewBrokerService(pool)
}

var brokerService *services.BrokerService

// ListBrokers returns the user's broker rows plus all available built-in presets.
func ListBrokers(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.RequireUserID(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	brokers, err := brokerService.ListBrokers(r.Context(), userID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]any{
		"brokers": brokers,
		"presets": config.BuiltInBrokerPresets,
	})
}

// CreateBrokerRequest selects or creates a broker from a built-in preset.
type CreateBrokerRequest struct {
	PresetID string `json:"preset_id"`
}

// CreateBroker creates a broker row for the authenticated user from a preset.
func CreateBroker(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.RequireUserID(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req CreateBrokerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.PresetID == "" {
		httpx.Error(w, http.StatusBadRequest, "preset_id is required")
		return
	}
	if config.GetBrokerPreset(req.PresetID) == nil {
		httpx.Error(w, http.StatusBadRequest, "Unknown preset")
		return
	}

	broker, err := brokerService.GetOrCreateBrokerFromPreset(r.Context(), userID, req.PresetID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	httpx.JSON(w, http.StatusCreated, broker)
}