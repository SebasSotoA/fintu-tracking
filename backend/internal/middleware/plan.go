package middleware

import (
	"net/http"

	"fintu-tracking-backend/internal/httpx"
	"fintu-tracking-backend/internal/services"
)

// RequireActivePlan returns a middleware that blocks requests when the user has
// no active or trialing subscription. Routes for managing the subscription itself
// should be placed outside this middleware.
func RequireActivePlan(svc *services.BillingService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, ok := RequireUserID(r)
			if !ok {
				httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
				return
			}

			active, err := svc.HasActiveSubscription(r.Context(), userID)
			if err != nil {
				httpx.Error(w, http.StatusInternalServerError, err.Error())
				return
			}

			if !active {
				httpx.Error(w, http.StatusPaymentRequired, "Active subscription required")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}