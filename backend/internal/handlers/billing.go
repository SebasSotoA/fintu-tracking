package handlers

import (
	"fintu-tracking-backend/internal/middleware"
	"fintu-tracking-backend/internal/models"
	"fintu-tracking-backend/internal/services"

	"github.com/gofiber/fiber/v3"
)

// billingService is the package-level billing service used by handlers.
// It is initialized once from main.go after the DB pool is available.
var billingService *services.BillingService

// InitBillingService sets the package-level billing service used by handlers.
func InitBillingService(svc *services.BillingService) {
	billingService = svc
}

// ListPlans returns public plans plus the user's current plan.
func ListPlans(c fiber.Ctx) error {
	userID, err := middleware.RequireUserID(c)
	if err != nil {
		return err
	}

	plans, err := billingService.ListPlans(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(plans)
}

// GetSubscription returns the current user's subscription.
func GetSubscription(c fiber.Ctx) error {
	userID, err := middleware.RequireUserID(c)
	if err != nil {
		return err
	}

	subscription, err := billingService.GetSubscription(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if subscription == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "No subscription found"})
	}

	return c.JSON(subscription)
}

// CreateSubscription creates or updates the user's subscription.
func CreateSubscription(c fiber.Ctx) error {
	userID, err := middleware.RequireUserID(c)
	if err != nil {
		return err
	}

	var req models.CreateSubscriptionRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	subscription, err := billingService.CreateSubscription(c.Context(), userID, req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(subscription)
}

// CancelSubscription cancels the user's subscription.
func CancelSubscription(c fiber.Ctx) error {
	userID, err := middleware.RequireUserID(c)
	if err != nil {
		return err
	}

	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "subscription id is required"})
	}

	subscription, err := billingService.CancelSubscription(c.Context(), userID, id)
	if err != nil {
		status := fiber.StatusBadRequest
		if err.Error() == "subscription not found" {
			status = fiber.StatusNotFound
		}
		return c.Status(status).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(subscription)
}
