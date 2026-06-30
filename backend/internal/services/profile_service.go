package services

import (
	"context"
	"fmt"

	"fintu-tracking-backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ProfileService manages per-user onboarding, UI preference, and cached subscription state.
type ProfileService struct {
	pool    *pgxpool.Pool
	billing *BillingService
}

// NewProfileService creates a ProfileService backed by the given DB pool and billing service.
func NewProfileService(pool *pgxpool.Pool, billing *BillingService) *ProfileService {
	return &ProfileService{pool: pool, billing: billing}
}

// GetOrCreateProfile returns the user's profile, inserting a default row if missing
// and ensuring the user has a closed_beta subscription.
func (s *ProfileService) GetOrCreateProfile(ctx context.Context, userID string) (*models.Profile, error) {
	rows, err := s.pool.Query(ctx, `
		INSERT INTO profiles (user_id, country, onboarding_completed, onboarding_step)
		VALUES ($1, 'co', false, 'welcome')
		ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
		RETURNING id, user_id, country, broker_preset_id, onboarding_completed, onboarding_step, plan_id, subscription_status, created_at, updated_at
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("upserting profile: %w", err)
	}
	defer rows.Close()

	profile, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[models.Profile])
	if err != nil {
		return nil, fmt.Errorf("collecting profile: %w", err)
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

	return &profile, nil
}

// GetProfile returns the user's profile by ID.
func (s *ProfileService) GetProfile(ctx context.Context, userID string) (*models.Profile, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, user_id, country, broker_preset_id, onboarding_completed, onboarding_step,
		       plan_id, subscription_status, created_at, updated_at
		FROM profiles
		WHERE user_id = $1
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("fetching profile: %w", err)
	}
	defer rows.Close()

	profile, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[models.Profile])
	if err != nil {
		return nil, fmt.Errorf("collecting profile: %w", err)
	}
	return &profile, nil
}

// UpdateOnboarding stores the selected country and broker preset and marks onboarding completed.
func (s *ProfileService) UpdateOnboarding(ctx context.Context, userID string, req models.UpdateOnboardingRequest) (*models.Profile, error) {
	if _, err := s.GetOrCreateProfile(ctx, userID); err != nil {
		return nil, err
	}

	rows, err := s.pool.Query(ctx, `
		UPDATE profiles
		SET country = $2,
		    broker_preset_id = $3,
		    onboarding_completed = true,
		    onboarding_step = 'completed',
		    updated_at = NOW()
		WHERE user_id = $1
		RETURNING id, user_id, country, broker_preset_id, onboarding_completed, onboarding_step, created_at, updated_at
	`, userID, req.Country, req.BrokerPresetID)
	if err != nil {
		return nil, fmt.Errorf("updating onboarding: %w", err)
	}
	defer rows.Close()

	profile, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[models.Profile])
	if err != nil {
		return nil, fmt.Errorf("collecting updated profile: %w", err)
	}
	return &profile, nil
}
