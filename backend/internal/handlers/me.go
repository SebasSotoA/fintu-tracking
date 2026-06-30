package handlers

import (
	"fintu-tracking-backend/internal/config"
	"fintu-tracking-backend/internal/middleware"
	"fintu-tracking-backend/internal/models"
	"fintu-tracking-backend/internal/services"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
)

// profileService is the package-level profile service used by handlers.
// It is initialized once from main.go after the DB pool is available.
var profileService *services.ProfileService

// InitProfileService sets the package-level profile service used by handlers.
func InitProfileService(pool *pgxpool.Pool) {
	profileService = services.NewProfileService(pool, billingService)
}

// GetMe returns the current user's profile. Creates a default profile row if missing.
func GetMe(c fiber.Ctx) error {
	userID, err := middleware.RequireUserID(c)
	if err != nil {
		return err
	}

	p, err := profileService.GetOrCreateProfile(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(p)
}

// UpdateOnboarding stores country + broker selection and marks onboarding completed.
func UpdateOnboarding(c fiber.Ctx) error {
	userID, err := middleware.RequireUserID(c)
	if err != nil {
		return err
	}

	var req models.UpdateOnboardingRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.Country == "" || req.BrokerPresetID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "country and broker_preset_id are required"})
	}
	if config.GetBrokerPreset(req.BrokerPresetID) == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Unknown broker preset"})
	}

	p, err := profileService.UpdateOnboarding(c.Context(), userID, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(p)
}
