package services

import (
	"context"
	"fmt"
	"strings"

	"fintu-tracking-backend/internal/config"
	"fintu-tracking-backend/internal/models"

	"github.com/shopspring/decimal"
)

// BrokerService manages user broker records built from built-in presets.
type BrokerService struct {
	repo BrokerRepository
}

// NewBrokerService creates a BrokerService backed by the given repository.
func NewBrokerService(repo BrokerRepository) *BrokerService {
	return &BrokerService{repo: repo}
}

// ListBrokers returns every broker row owned by the user.
func (s *BrokerService) ListBrokers(ctx context.Context, userID string) ([]models.Broker, error) {
	return s.repo.ListBrokers(ctx, userID)
}

// GetBrokerByID returns a broker row if it exists and belongs to the user.
func (s *BrokerService) GetBrokerByID(ctx context.Context, userID, brokerID string) (*models.Broker, error) {
	return s.repo.GetBrokerByID(ctx, userID, brokerID)
}

// GetOrCreateBrokerFromPreset returns an existing user broker for the preset or
// creates one from the built-in preset configuration. It is idempotent.
func (s *BrokerService) GetOrCreateBrokerFromPreset(ctx context.Context, userID, presetID string) (*models.Broker, error) {
	return s.repo.GetOrCreateBrokerFromPreset(ctx, userID, presetID)
}

// ComputeDepositFeeUSD calculates the USD fee for depositing netUsd with the
// given broker. It returns nil when no fee applies or inputs are invalid.
func (s *BrokerService) ComputeDepositFeeUSD(netUsd string, broker models.Broker) (*string, error) {
	return computeBrokerFeeUSD(netUsd, broker.DepositFeeType, broker.DepositFeeValue)
}

// ComputeWithdrawalFeeUSD calculates the USD fee for withdrawing netUsd with the
// given broker. It returns nil when no fee applies or inputs are invalid.
func (s *BrokerService) ComputeWithdrawalFeeUSD(netUsd string, broker models.Broker) (*string, error) {
	return computeBrokerFeeUSD(netUsd, broker.WithdrawalFeeType, broker.WithdrawalFeeValue)
}

func computeBrokerFeeUSD(netUsd, feeType, feeValue string) (*string, error) {
	trimmed := strings.TrimSpace(netUsd)
	if trimmed == "" {
		return nil, nil
	}

	net, err := decimal.NewFromString(trimmed)
	if err != nil {
		return nil, fmt.Errorf("invalid net amount: %w", err)
	}
	if net.LessThanOrEqual(decimal.Zero) {
		return nil, nil
	}

	switch config.BrokerFeeType(feeType) {
	case config.BrokerFeeTypeNone:
		zero := "0.00"
		return &zero, nil
	case config.BrokerFeeTypeFlat:
		value, err := decimal.NewFromString(strings.TrimSpace(feeValue))
		if err != nil {
			return nil, fmt.Errorf("invalid flat fee value: %w", err)
		}
		result := value.StringFixed(2)
		return &result, nil
	case config.BrokerFeeTypePercentage:
		value, err := decimal.NewFromString(strings.TrimSpace(feeValue))
		if err != nil {
			return nil, fmt.Errorf("invalid percentage fee value: %w", err)
		}
		result := net.Mul(value).StringFixed(2)
		return &result, nil
	default:
		return nil, fmt.Errorf("unsupported fee type %q", feeType)
	}
}