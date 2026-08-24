package services

import (
	"context"
	"fmt"

	"fintu-tracking-backend/internal/models"
)

// BillingServiceInterface is the narrow slice of BillingService that
// ProfileService depends on. BillingService satisfies it implicitly.
type BillingServiceInterface interface {
	GetOrCreateClosedBetaSubscription(ctx context.Context, userID string) (*models.Subscription, error)
	HasActiveSubscription(ctx context.Context, userID string) (bool, error)
}

// BrokerServiceInterface is the narrow slice of BrokerService that
// ProfileService depends on. BrokerService satisfies it implicitly.
type BrokerServiceInterface interface {
	GetOrCreateBrokerFromPreset(ctx context.Context, userID, presetID string) (*models.Broker, error)
	ComputeDepositFeeUSD(netUsd string, broker models.Broker) (*string, error)
	ComputeWithdrawalFeeUSD(netUsd string, broker models.Broker) (*string, error)
}

// ProfileService manages per-user onboarding, UI preference, and cached subscription state.
type ProfileService struct {
	repo    ProfileRepository
	billing BillingServiceInterface
	brokers BrokerServiceInterface
}

// NewProfileService creates a ProfileService backed by the given repository, billing,
// and broker services.
func NewProfileService(repo ProfileRepository, billing BillingServiceInterface, brokers BrokerServiceInterface) *ProfileService {
	return &ProfileService{repo: repo, billing: billing, brokers: brokers}
}

// GetOrCreateProfile returns the user's profile, inserting a default row if missing
// and ensuring the user has a closed_beta subscription.
func (s *ProfileService) GetOrCreateProfile(ctx context.Context, userID string) (*models.Profile, error) {
	profile, err := s.repo.GetOrCreateProfile(ctx, userID)
	if err != nil {
		return nil, err
	}

	if s.billing != nil {
		if _, err := s.billing.GetOrCreateClosedBetaSubscription(ctx, userID); err != nil {
			return nil, fmt.Errorf("ensuring closed_beta subscription: %w", err)
		}

		// Refresh profile to include the denormalized subscription cache.
		refreshed, err := s.GetProfile(ctx, userID)
		if err != nil {
			return nil, err
		}
		return refreshed, nil
	}

	return profile, nil
}

// GetProfile returns the user's profile by ID.
func (s *ProfileService) GetProfile(ctx context.Context, userID string) (*models.Profile, error) {
	return s.repo.GetProfile(ctx, userID)
}

// UpdateOnboarding stores the selected country and broker preset and marks onboarding completed.
func (s *ProfileService) UpdateOnboarding(ctx context.Context, userID string, req models.UpdateOnboardingRequest) (*models.Profile, error) {
	if _, err := s.GetOrCreateProfile(ctx, userID); err != nil {
		return nil, err
	}

	return s.repo.UpdateOnboarding(ctx, userID, req)
}

// UpdateProfile updates country and broker preset without changing onboarding state.
func (s *ProfileService) UpdateProfile(ctx context.Context, userID string, req models.UpdateProfileRequest) (*models.Profile, error) {
	current, err := s.GetOrCreateProfile(ctx, userID)
	if err != nil {
		return nil, err
	}

	presetChanged := current.BrokerPresetID == nil || *current.BrokerPresetID != req.BrokerPresetID
	if presetChanged && s.brokers != nil {
		if _, err := s.brokers.GetOrCreateBrokerFromPreset(ctx, userID, req.BrokerPresetID); err != nil {
			return nil, fmt.Errorf("creating broker from preset: %w", err)
		}
	}

	return s.repo.UpdateProfile(ctx, userID, req)
}