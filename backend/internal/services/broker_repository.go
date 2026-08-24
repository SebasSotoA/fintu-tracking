package services

import (
	"context"

	"fintu-tracking-backend/internal/models"
)

// BrokerRepository abstracts database operations for brokers.
type BrokerRepository interface {
	ListBrokers(ctx context.Context, userID string) ([]models.Broker, error)
	GetBrokerByID(ctx context.Context, userID, brokerID string) (*models.Broker, error)
	GetOrCreateBrokerFromPreset(ctx context.Context, userID, presetID string) (*models.Broker, error)
}