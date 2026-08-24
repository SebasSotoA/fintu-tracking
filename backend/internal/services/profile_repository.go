package services

import (
	"context"

	"fintu-tracking-backend/internal/models"
)

// ProfileRepository abstracts database operations for the profiles table.
// Implementations live in the repositories package; the service holds this
// interface and applies business rules on top of the data it returns.
type ProfileRepository interface {
	// GetOrCreateProfile upserts a default profile row for the user and returns it.
	GetOrCreateProfile(ctx context.Context, userID string) (*models.Profile, error)

	// GetProfile returns the user's profile by user id.
	GetProfile(ctx context.Context, userID string) (*models.Profile, error)

	// UpdateOnboarding stores the selected country and broker preset and marks
	// onboarding completed. The caller is responsible for ensuring the profile
	// exists first (e.g. via GetOrCreateProfile).
	UpdateOnboarding(ctx context.Context, userID string, req models.UpdateOnboardingRequest) (*models.Profile, error)

	// UpdateProfile updates country and broker preset without altering onboarding
	// state. The caller is responsible for ensuring the profile exists first and
	// for any broker creation side effects when the preset changes.
	UpdateProfile(ctx context.Context, userID string, req models.UpdateProfileRequest) (*models.Profile, error)
}