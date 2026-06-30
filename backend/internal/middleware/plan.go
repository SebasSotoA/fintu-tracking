package middleware

import (
	"fintu-tracking-backend/internal/services"

	"github.com/gofiber/fiber/v3"
)

// RequireActivePlan returns a middleware that blocks requests when the user has
// no active or trialing subscription. Routes for managing the subscription itself
// should be placed outside this middleware.
func RequireActivePlan(svc *services.BillingService) fiber.Handler {
	return func(c fiber.Ctx) error {
		userID, err := RequireUserID(c)
		if err != nil {
			return err
		}

		active, err := svc.HasActiveSubscription(c.Context(), userID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		if !active {
			return c.Status(fiber.StatusPaymentRequired).JSON(fiber.Map{
				"error": "Active subscription required",
			})
		}

		return c.Next()
	}
}
