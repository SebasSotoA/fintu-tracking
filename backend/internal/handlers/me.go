package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"fintu-tracking-backend/internal/config"
	"fintu-tracking-backend/internal/httpx"
	"fintu-tracking-backend/internal/middleware"
	"fintu-tracking-backend/internal/models"
	"fintu-tracking-backend/internal/services"
)

// profileService is the package-level profile service used by handlers.
// It is initialized once from Bootstrap after the DB pool is available.
var profileService *services.ProfileService

// InitProfileService sets the package-level profile service used by handlers.
func InitProfileService(svc *services.ProfileService) {
	profileService = svc
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
// A locale-only body is valid so onboarding-incomplete users can persist language.
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
	if err := validateUpdateProfileRequest(req); err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	p, err := profileService.UpdateProfile(r.Context(), userID, req)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, p)
}

func validateUpdateProfileRequest(req models.UpdateProfileRequest) error {
	if req.IsLocaleOnly() {
		if req.Locale == nil {
			return errors.New("locale, or country and broker_preset_id, is required")
		}
		if !validLocale(*req.Locale) {
			return errors.New("invalid locale")
		}
		return nil
	}
	if req.Country == "" || req.BrokerPresetID == "" {
		return errors.New("country and broker_preset_id are required")
	}
	if config.GetBrokerPreset(req.BrokerPresetID) == nil {
		return errors.New("Unknown broker preset")
	}
	if req.Locale != nil && !validLocale(*req.Locale) {
		return errors.New("invalid locale")
	}
	return nil
}

func validLocale(locale string) bool {
	return locale == "en" || locale == "es"
}
