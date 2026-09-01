package repositories

import (
	"context"
	"fmt"

	"fintu-tracking-backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const profileColumns = `id, user_id, country, broker_preset_id, locale, onboarding_completed, onboarding_step, plan_id, subscription_status, created_at, updated_at`

// PostgresProfileRepository implements services.ProfileRepository against Postgres.
type PostgresProfileRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresProfileRepository returns a ProfileRepository backed by the given pool.
// The concrete type is returned so the repositories package never imports services.
func NewPostgresProfileRepository(pool *pgxpool.Pool) *PostgresProfileRepository {
	return &PostgresProfileRepository{pool: pool}
}

// GetOrCreateProfile upserts a default profile row for the user and returns it.
func (r *PostgresProfileRepository) GetOrCreateProfile(ctx context.Context, userID string) (*models.Profile, error) {
	rows, err := r.pool.Query(ctx, `
		INSERT INTO profiles (user_id, country, onboarding_completed, onboarding_step)
		VALUES ($1, 'co', false, 'welcome')
		ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
		RETURNING `+profileColumns, userID)
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

// GetProfile returns the user's profile by user id.
func (r *PostgresProfileRepository) GetProfile(ctx context.Context, userID string) (*models.Profile, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT `+profileColumns+`
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

// UpdateOnboarding stores the selected country and broker preset and marks onboarding
// completed.
func (r *PostgresProfileRepository) UpdateOnboarding(ctx context.Context, userID string, req models.UpdateOnboardingRequest) (*models.Profile, error) {
	rows, err := r.pool.Query(ctx, `
		UPDATE profiles
		SET country = $2,
		    broker_preset_id = $3,
		    onboarding_completed = true,
		    onboarding_step = 'completed',
		    updated_at = NOW()
		WHERE user_id = $1
		RETURNING `+profileColumns, userID, req.Country, req.BrokerPresetID)
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

// UpdateProfile updates country and broker preset without altering onboarding state.
// Locale-only requests update language and leave country/broker unchanged.
func (r *PostgresProfileRepository) UpdateProfile(ctx context.Context, userID string, req models.UpdateProfileRequest) (*models.Profile, error) {
	if req.IsLocaleOnly() {
		return r.updateLocale(ctx, userID, req.Locale)
	}

	rows, err := r.pool.Query(ctx, `
		UPDATE profiles
		SET country = $2,
		    broker_preset_id = $3,
		    locale = COALESCE($4, locale),
		    updated_at = NOW()
		WHERE user_id = $1
		RETURNING `+profileColumns, userID, req.Country, req.BrokerPresetID, req.Locale)
	if err != nil {
		return nil, fmt.Errorf("updating profile: %w", err)
	}
	defer rows.Close()

	profile, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[models.Profile])
	if err != nil {
		return nil, fmt.Errorf("collecting updated profile: %w", err)
	}
	return &profile, nil
}

func (r *PostgresProfileRepository) updateLocale(ctx context.Context, userID string, locale *string) (*models.Profile, error) {
	rows, err := r.pool.Query(ctx, `
		UPDATE profiles
		SET locale = $2,
		    updated_at = NOW()
		WHERE user_id = $1
		RETURNING `+profileColumns, userID, locale)
	if err != nil {
		return nil, fmt.Errorf("updating profile locale: %w", err)
	}
	defer rows.Close()

	profile, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[models.Profile])
	if err != nil {
		return nil, fmt.Errorf("collecting updated profile: %w", err)
	}
	return &profile, nil
}
