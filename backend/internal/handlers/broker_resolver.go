package handlers

import (
	"context"
	"fmt"

	"fintu-tracking-backend/internal/models"

	"github.com/google/uuid"
)

// brokerResolver is the minimal interface resolveBrokerID needs.
// *services.BrokerService satisfies it.
type brokerResolver interface {
	GetBrokerByID(ctx context.Context, userID, brokerID string) (*models.Broker, error)
	GetOrCreateBrokerFromPreset(ctx context.Context, userID, presetID string) (*models.Broker, error)
}

// resolveBrokerID translates a broker_id field from the request into the
// canonical broker UUID owned by userID. The input may be either a real broker
// UUID or a preset slug; both are resolved to the UUID stored in the DB.
// Returns nil, nil when brokerID is absent or empty (optional broker).
func resolveBrokerID(ctx context.Context, resolver brokerResolver, userID string, brokerID *string) (*string, error) {
	if brokerID == nil || *brokerID == "" {
		return nil, nil
	}

	// Only attempt direct UUID lookup when the input is a valid UUID.
	// Passing a preset slug (e.g. "hapi-colombia") to a uuid column would cause
	// Postgres to return "invalid input syntax for type uuid"; skip straight to
	// GetOrCreate for non-UUID inputs.
	if isValidUUID(*brokerID) {
		broker, err := resolver.GetBrokerByID(ctx, userID, *brokerID)
		if err != nil {
			return nil, fmt.Errorf("resolving broker: %w", err)
		}
		if broker != nil {
			return &broker.ID, nil
		}
		// UUID not in DB – fall through to preset lookup.
	}

	// Not a UUID (preset slug), or UUID not found – try preset lookup.
	broker, err := resolver.GetOrCreateBrokerFromPreset(ctx, userID, *brokerID)
	if err != nil {
		return nil, fmt.Errorf("invalid broker_id")
	}
	return &broker.ID, nil
}

func isValidUUID(s string) bool {
	_, err := uuid.Parse(s)
	return err == nil
}
