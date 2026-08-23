package handlers

import (
	"encoding/json"
	"net/http"

	"fintu-tracking-backend/internal/config"
	"fintu-tracking-backend/internal/httpx"
	"fintu-tracking-backend/internal/middleware"
	"fintu-tracking-backend/internal/models"
	"fintu-tracking-backend/internal/services"

	"github.com/jackc/pgx/v5/pgxpool"
)

// profileService is the package-level profile service used by handlers.
// It is initialized once from main.go after the DB pool is available.
var profileService *services.ProfileService

// InitProfileService sets the package-level profile service used by handlers.
func InitProfileService(pool *pgxpool.Pool) {
	profileService = services.NewProfileService(pool, billingService, services.NewBrokerService(pool))
}

// GetMe returns the current user's profile. Creates a default profile row if missing.
func GetMe(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.RequireUserID(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	p, err := profileService.GetOrCreateProfile(r.Context(), userID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, p)
}

// UpdateOnboarding stores country + broker selection and marks onboarding completed.
func UpdateOnboarding(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.RequireUserID(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req models.UpdateOnboardingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.Country == "" || req.BrokerPresetID == "" {
		httpx.Error(w, http.StatusBadRequest, "country and broker_preset_id are required")
		return
	}
	if config.GetBrokerPreset(req.BrokerPresetID) == nil {
		httpx.Error(w, http.StatusBadRequest, "Unknown broker preset")
		return
	}

	p, err := profileService.UpdateOnboarding(r.Context(), userID, req)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, p)
}

// UpdateProfile updates country and broker preset without altering onboarding state.
func UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.RequireUserID(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req models.UpdateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.Country == "" || req.BrokerPresetID == "" {
		httpx.Error(w, http.StatusBadRequest, "country and broker_preset_id are required")
		return
	}
	if config.GetBrokerPreset(req.BrokerPresetID) == nil {
		httpx.Error(w, http.StatusBadRequest, "Unknown broker preset")
		return
	}

	p, err := profileService.UpdateProfile(r.Context(), userID, req)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, p)
}