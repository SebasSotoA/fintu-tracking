package services

import (
	"context"
	"fmt"

	"fintu-tracking-backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ProfileService manages per-user onboarding and UI preference state.
type ProfileService struct {
	pool *pgxpool.Pool
}

// NewProfileService creates a ProfileService backed by the given DB pool.
func NewProfileService(pool *pgxpool.Pool) *ProfileService {
	return &ProfileService{pool: pool}
}

// GetOrCreateProfile returns the user's profile, inserting a default row if missing.
func (s *ProfileService) GetOrCreateProfile(ctx context.Context, userID string) (*models.Profile, error) {
	rows, err := s.pool.Query(ctx, `
		INSERT INTO profiles (user_id, country, onboarding_completed, onboarding_step)
		VALUES ($1, 'co', false, 'welcome')
		ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
		RETURNING id, user_id, country, broker_preset_id, onboarding_completed, onboarding_step, created_at, updated_at
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("upserting profile: %w", err)
	}
	defer rows.Close()

	profile, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[models.Profile])
	if err != nil {
		return nil, fmt.Errorf("collecting profile: %w", err)
	}
	return &profile, nil
}

// UpdateOnboarding writes the onboarding selection and optionally marks completion.
func (s *ProfileService) UpdateOnboarding(ctx context.Context, userID string, req models.UpdateOnboardingRequest) (*models.Profile, error) {
	if _, err := s.GetOrCreateProfile(ctx, userID); err != nil {
		return nil, err
	}

	completed := false
	if req.Completed != nil {
		completed = *req.Completed
	}
	step := "welcome"
	if req.Step != nil {
		step = *req.Step
	} else if completed {
		step = "completed"
	}

	rows, err := s.pool.Query(ctx, `
		UPDATE profiles
		SET country = $2,
		    broker_preset_id = $3,
		    onboarding_completed = $4,
		    onboarding_step = $5,
		    updated_at = NOW()
		WHERE user_id = $1
		RETURNING id, user_id, country, broker_preset_id, onboarding_completed, onboarding_step, created_at, updated_at
	`, userID, req.Country, req.BrokerPresetID, completed, step)
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
