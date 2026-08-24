package services

import (
	"context"
	"errors"
	"testing"

	"fintu-tracking-backend/internal/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeProfileRepository is an in-memory ProfileRepository for unit tests. It does
// not require a database and records calls so assertions can verify the service
// drove the data layer correctly.
type fakeProfileRepository struct {
	getOrCreate      *models.Profile
	getOrCreateErr   error
	getOrCreateCalls int

	getProfile      *models.Profile
	getProfileErr   error
	getProfileCalls int

	updateOnboarding      *models.Profile
	updateOnboardingErr   error
	updateOnboardingCalls  int
	updateOnboardingArgs  models.UpdateOnboardingRequest

	updateProfile      *models.Profile
	updateProfileErr   error
	updateProfileCalls int
	updateProfileArgs  models.UpdateProfileRequest
}

func (f *fakeProfileRepository) GetOrCreateProfile(ctx context.Context, userID string) (*models.Profile, error) {
	f.getOrCreateCalls++
	if f.getOrCreateErr != nil {
		return nil, f.getOrCreateErr
	}
	if f.getOrCreate != nil {
		return f.getOrCreate, nil
	}
	step := "welcome"
	return &models.Profile{
		UserID:              userID,
		Country:             "co",
		OnboardingCompleted: false,
		OnboardingStep:      step,
	}, nil
}

func (f *fakeProfileRepository) GetProfile(ctx context.Context, userID string) (*models.Profile, error) {
	f.getProfileCalls++
	if f.getProfileErr != nil {
		return nil, f.getProfileErr
	}
	if f.getProfile != nil {
		return f.getProfile, nil
	}
	step := "welcome"
	planID := models.PlanIDClosedBeta
	status := models.SubscriptionStatusActive
	return &models.Profile{
		UserID:              userID,
		Country:             "co",
		OnboardingCompleted: false,
		OnboardingStep:      step,
		PlanID:              &planID,
		SubscriptionStatus:  &status,
	}, nil
}

func (f *fakeProfileRepository) UpdateOnboarding(ctx context.Context, userID string, req models.UpdateOnboardingRequest) (*models.Profile, error) {
	f.updateOnboardingCalls++
	f.updateOnboardingArgs = req
	if f.updateOnboardingErr != nil {
		return nil, f.updateOnboardingErr
	}
	if f.updateOnboarding != nil {
		return f.updateOnboarding, nil
	}
	preset := req.BrokerPresetID
	step := "completed"
	return &models.Profile{
		UserID:              userID,
		Country:             req.Country,
		BrokerPresetID:      &preset,
		OnboardingCompleted: true,
		OnboardingStep:      step,
	}, nil
}

func (f *fakeProfileRepository) UpdateProfile(ctx context.Context, userID string, req models.UpdateProfileRequest) (*models.Profile, error) {
	f.updateProfileCalls++
	f.updateProfileArgs = req
	if f.updateProfileErr != nil {
		return nil, f.updateProfileErr
	}
	if f.updateProfile != nil {
		return f.updateProfile, nil
	}
	preset := req.BrokerPresetID
	step := "completed"
	return &models.Profile{
		UserID:              userID,
		Country:             req.Country,
		BrokerPresetID:      &preset,
		OnboardingCompleted: true,
		OnboardingStep:      step,
	}, nil
}

// fakeBillingService is a fake BillingServiceInterface for ProfileService unit tests.
type fakeBillingService struct {
	closedBeta      *models.Subscription
	closedBetaErr   error
	closedBetaCalls int

	hasActive      bool
	hasActiveErr   error
	hasActiveCalls int
}

func (f *fakeBillingService) GetOrCreateClosedBetaSubscription(ctx context.Context, userID string) (*models.Subscription, error) {
	f.closedBetaCalls++
	if f.closedBetaErr != nil {
		return nil, f.closedBetaErr
	}
	if f.closedBeta != nil {
		return f.closedBeta, nil
	}
	return &models.Subscription{ID: "sub-1", UserID: userID, PlanID: models.PlanIDClosedBeta, Status: models.SubscriptionStatusActive}, nil
}

func (f *fakeBillingService) HasActiveSubscription(ctx context.Context, userID string) (bool, error) {
	f.hasActiveCalls++
	if f.hasActiveErr != nil {
		return false, f.hasActiveErr
	}
	return f.hasActive, nil
}

// fakeBrokerService is a fake BrokerServiceInterface for ProfileService unit tests.
type fakeBrokerService struct {
	preset          *models.Broker
	presetErr       error
	presetCalls     int
	presetLastID    string
	depositFee      *string
	depositErr      error
	withdrawalFee   *string
	withdrawalErr   error
}

func (f *fakeBrokerService) GetOrCreateBrokerFromPreset(ctx context.Context, userID, presetID string) (*models.Broker, error) {
	f.presetCalls++
	f.presetLastID = presetID
	if f.presetErr != nil {
		return nil, f.presetErr
	}
	if f.preset != nil {
		return f.preset, nil
	}
	return &models.Broker{ID: "broker-" + presetID, UserID: userID, PresetID: presetID, Name: presetID}, nil
}

func (f *fakeBrokerService) ComputeDepositFeeUSD(netUsd string, broker models.Broker) (*string, error) {
	if f.depositErr != nil {
		return nil, f.depositErr
	}
	return f.depositFee, nil
}

func (f *fakeBrokerService) ComputeWithdrawalFeeUSD(netUsd string, broker models.Broker) (*string, error) {
	if f.withdrawalErr != nil {
		return nil, f.withdrawalErr
	}
	return f.withdrawalFee, nil
}

// --- GetOrCreateProfile ------------------------------------------------------

func TestProfileService_Unit_GetOrCreateProfile_CreatesClosedBetaSub(t *testing.T) {
	repo := &fakeProfileRepository{}
	billing := &fakeBillingService{}
	svc := NewProfileService(repo, billing, nil)

	profile, err := svc.GetOrCreateProfile(context.Background(), "u1")
	require.NoError(t, err)
	require.NotNil(t, profile)
	assert.Equal(t, "u1", profile.UserID)
	assert.Equal(t, 1, repo.getOrCreateCalls)
	assert.Equal(t, 1, repo.getProfileCalls, "service refreshes profile after billing sync")
	assert.Equal(t, 1, billing.closedBetaCalls, "service ensures closed_beta subscription")
}

func TestProfileService_Unit_GetOrCreateProfile_SkipsBillingWhenNil(t *testing.T) {
	repo := &fakeProfileRepository{}
	svc := NewProfileService(repo, nil, nil)

	profile, err := svc.GetOrCreateProfile(context.Background(), "u1")
	require.NoError(t, err)
	require.NotNil(t, profile)
	assert.Equal(t, "u1", profile.UserID)
	assert.Equal(t, 1, repo.getOrCreateCalls)
	assert.Equal(t, 0, repo.getProfileCalls, "no refresh when billing is nil")
}

func TestProfileService_Unit_GetOrCreateProfile_PropagatesBillingError(t *testing.T) {
	repo := &fakeProfileRepository{}
	billing := &fakeBillingService{closedBetaErr: errors.New("stripe down")}
	svc := NewProfileService(repo, billing, nil)

	_, err := svc.GetOrCreateProfile(context.Background(), "u1")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "ensuring closed_beta subscription")
	assert.Equal(t, 1, billing.closedBetaCalls)
	assert.Equal(t, 0, repo.getProfileCalls, "no refresh when billing fails")
}

// --- UpdateOnboarding --------------------------------------------------------

func TestProfileService_Unit_UpdateOnboarding_MarksCompleted(t *testing.T) {
	repo := &fakeProfileRepository{}
	billing := &fakeBillingService{}
	svc := NewProfileService(repo, billing, nil)

	profile, err := svc.UpdateOnboarding(context.Background(), "u1", models.UpdateOnboardingRequest{
		Country:        "mx",
		BrokerPresetID: "gbm-mexico",
	})
	require.NoError(t, err)
	require.NotNil(t, profile)
	assert.True(t, profile.OnboardingCompleted, "onboarding marked completed")
	assert.Equal(t, "completed", profile.OnboardingStep)
	assert.Equal(t, "mx", repo.updateOnboardingArgs.Country)
	assert.Equal(t, "gbm-mexico", repo.updateOnboardingArgs.BrokerPresetID)
	assert.Equal(t, 1, repo.updateOnboardingCalls)
	assert.Equal(t, 1, repo.getOrCreateCalls, "service ensures profile exists first")
}

func TestProfileService_Unit_UpdateOnboarding_PropagatesRepoError(t *testing.T) {
	repo := &fakeProfileRepository{updateOnboardingErr: errors.New("db write failed")}
	billing := &fakeBillingService{}
	svc := NewProfileService(repo, billing, nil)

	_, err := svc.UpdateOnboarding(context.Background(), "u1", models.UpdateOnboardingRequest{
		Country:        "mx",
		BrokerPresetID: "gbm-mexico",
	})
	require.Error(t, err)
	assert.Equal(t, 1, repo.updateOnboardingCalls)
}

// --- UpdateProfile -----------------------------------------------------------

func TestProfileService_Unit_UpdateProfile_CreatesBrokerWhenPresetChanges(t *testing.T) {
	existingPreset := "hapi-colombia"
	current := &models.Profile{
		UserID:         "u1",
		BrokerPresetID: &existingPreset,
	}
	repo := &fakeProfileRepository{
		getOrCreate: current,
		getProfile:  current,
	}
	brokers := &fakeBrokerService{}
	billing := &fakeBillingService{}
	svc := NewProfileService(repo, billing, brokers)

	profile, err := svc.UpdateProfile(context.Background(), "u1", models.UpdateProfileRequest{
		Country:        "mx",
		BrokerPresetID: "gbm-mexico",
	})
	require.NoError(t, err)
	require.NotNil(t, profile)
	assert.Equal(t, "gbm-mexico", brokers.presetLastID, "broker created for new preset")
	assert.Equal(t, 1, brokers.presetCalls)
	assert.Equal(t, 1, repo.updateProfileCalls)
	assert.Equal(t, "mx", repo.updateProfileArgs.Country)
}

func TestProfileService_Unit_UpdateProfile_SkipsBrokerWhenPresetUnchanged(t *testing.T) {
	existingPreset := "hapi-colombia"
	current := &models.Profile{
		UserID:         "u1",
		BrokerPresetID: &existingPreset,
	}
	repo := &fakeProfileRepository{
		getOrCreate: current,
		getProfile:  current,
	}
	brokers := &fakeBrokerService{}
	billing := &fakeBillingService{}
	svc := NewProfileService(repo, billing, brokers)

	_, err := svc.UpdateProfile(context.Background(), "u1", models.UpdateProfileRequest{
		Country:        "mx",
		BrokerPresetID: "hapi-colombia",
	})
	require.NoError(t, err)
	assert.Equal(t, 0, brokers.presetCalls, "no broker created when preset unchanged")
	assert.Equal(t, 1, repo.updateProfileCalls)
}

func TestProfileService_Unit_UpdateProfile_CreatesBrokerWhenCurrentPresetNil(t *testing.T) {
	current := &models.Profile{
		UserID:         "u1",
		BrokerPresetID: nil,
	}
	repo := &fakeProfileRepository{
		getOrCreate: current,
		getProfile:  current,
	}
	brokers := &fakeBrokerService{}
	billing := &fakeBillingService{}
	svc := NewProfileService(repo, billing, brokers)

	_, err := svc.UpdateProfile(context.Background(), "u1", models.UpdateProfileRequest{
		Country:        "co",
		BrokerPresetID: "hapi-colombia",
	})
	require.NoError(t, err)
	assert.Equal(t, 1, brokers.presetCalls, "broker created when current preset is nil")
}

func TestProfileService_Unit_UpdateProfile_SkipsBrokerWhenBrokersNil(t *testing.T) {
	existingPreset := "hapi-colombia"
	current := &models.Profile{
		UserID:         "u1",
		BrokerPresetID: &existingPreset,
	}
	repo := &fakeProfileRepository{
		getOrCreate: current,
		getProfile:  current,
	}
	billing := &fakeBillingService{}
	svc := NewProfileService(repo, billing, nil)

	profile, err := svc.UpdateProfile(context.Background(), "u1", models.UpdateProfileRequest{
		Country:        "mx",
		BrokerPresetID: "gbm-mexico",
	})
	require.NoError(t, err)
	require.NotNil(t, profile)
	assert.Equal(t, 1, repo.updateProfileCalls)
}

func TestProfileService_Unit_UpdateProfile_PropagatesBrokerError(t *testing.T) {
	existingPreset := "hapi-colombia"
	current := &models.Profile{
		UserID:         "u1",
		BrokerPresetID: &existingPreset,
	}
	repo := &fakeProfileRepository{
		getOrCreate: current,
		getProfile:  current,
	}
	brokers := &fakeBrokerService{presetErr: errors.New("preset not found")}
	billing := &fakeBillingService{}
	svc := NewProfileService(repo, billing, brokers)

	_, err := svc.UpdateProfile(context.Background(), "u1", models.UpdateProfileRequest{
		Country:        "mx",
		BrokerPresetID: "gbm-mexico",
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "creating broker from preset")
	assert.Equal(t, 0, repo.updateProfileCalls, "profile not updated when broker creation fails")
}