package handlers

import (
	"fintu-tracking-backend/internal/config"
	"fintu-tracking-backend/internal/middleware"
	"fintu-tracking-backend/internal/services"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
)

// InitBrokerService sets the package-level broker service used by handlers.
// It is called once from main.go after the DB pool is available.
func InitBrokerService(pool *pgxpool.Pool) {
	brokerService = services.NewBrokerService(pool)
}

var brokerService *services.BrokerService

// ListBrokers returns the user's broker rows plus all available built-in presets.
func ListBrokers(c fiber.Ctx) error {
	userID, err := middleware.RequireUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	brokers, err := brokerService.ListBrokers(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"brokers": brokers,
		"presets": config.BuiltInBrokerPresets,
	})
}

// CreateBrokerRequest selects or creates a broker from a built-in preset.
type CreateBrokerRequest struct {
	PresetID string `json:"preset_id"`
}

// CreateBroker creates a broker row for the authenticated user from a preset.
func CreateBroker(c fiber.Ctx) error {
	userID, err := middleware.RequireUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req CreateBrokerRequest
	if err := c.Bind().JSON(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.PresetID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "preset_id is required"})
	}
	if config.GetBrokerPreset(req.PresetID) == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Unknown preset"})
	}

	broker, err := brokerService.GetOrCreateBrokerFromPreset(c.Context(), userID, req.PresetID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(broker)
}
