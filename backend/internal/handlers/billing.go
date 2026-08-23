package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"fintu-tracking-backend/internal/httpx"
	"fintu-tracking-backend/internal/middleware"
	"fintu-tracking-backend/internal/models"
	"fintu-tracking-backend/internal/services"

	"github.com/go-chi/chi/v5"
)

// billingService is the package-level billing service used by handlers.
// It is initialized once from main.go after the DB pool is available.
var billingService *services.BillingService

// InitBillingService sets the package-level billing service used by handlers.
func InitBillingService(svc *services.BillingService) {
	billingService = svc
}

// ListPlans returns public plans plus the user's current plan.
func ListPlans(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.RequireUserID(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	plans, err := billingService.ListPlans(r.Context(), userID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, plans)
}

// GetSubscription returns the current user's subscription.
func GetSubscription(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.RequireUserID(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	subscription, err := billingService.GetSubscription(r.Context(), userID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	if subscription == nil {
		httpx.Error(w, http.StatusNotFound, "No subscription found")
		return
	}

	httpx.JSON(w, http.StatusOK, subscription)
}

// CreateSubscription creates or updates the user's subscription.
func CreateSubscription(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.RequireUserID(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req models.CreateSubscriptionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	subscription, err := billingService.CreateSubscription(r.Context(), userID, req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	httpx.JSON(w, http.StatusCreated, subscription)
}

// CancelSubscription cancels the user's subscription.
func CancelSubscription(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.RequireUserID(r)
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	if id == "" {
		httpx.Error(w, http.StatusBadRequest, "subscription id is required")
		return
	}

	subscription, err := billingService.CancelSubscription(r.Context(), userID, id)
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, services.ErrSubscriptionNotFound) {
			status = http.StatusNotFound
		}
		httpx.Error(w, status, err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, subscription)
}