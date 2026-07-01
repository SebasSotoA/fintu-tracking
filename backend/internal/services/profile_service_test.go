package services

import (
	"context"
	"testing"

	"fintu-tracking-backend/internal/database"
	"fintu-tracking-backend/internal/models"

	"github.com/google/uuid"
)

func newTestUserID(t *testing.T) string {
	t.Helper()
	userID := uuid.New().String()
	seedSvcAuthUser(t, userID)
	t.Cleanup(func() {
		execSvcSQL(t, "DELETE FROM auth.users WHERE id = $1", userID)
	})
	return userID
}

func TestProfileService_GetOrCreateProfile_CreatesDefaultForNewUser(t *testing.T) {
	skipIfNoSvcTestDB(t)

	userID := newTestUserID(t)
	billingSvc := NewBillingService(database.GetPool(), NewNoOpBillingProvider())
	svc := NewProfileService(database.GetPool(), billingSvc, nil)

	profile, err := svc.GetOrCreateProfile(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetOrCreateProfile: %v", err)
	}

	if profile.UserID != userID {
		t.Errorf("UserID = %q, want %q", profile.UserID, userID)
	}
	if profile.Country != "co" {
		t.Errorf("Country = %q, want %q", profile.Country, "co")
	}
	if profile.OnboardingCompleted {
		t.Error("OnboardingCompleted = true, want false")
	}
	if profile.PlanID == nil || *profile.PlanID != "closed_beta" {
		t.Errorf("PlanID = %v, want %q", profile.PlanID, "closed_beta")
	}
	if profile.SubscriptionStatus == nil || *profile.SubscriptionStatus != "active" {
		t.Errorf("SubscriptionStatus = %v, want %q", profile.SubscriptionStatus, "active")
	}

	t.Cleanup(func() {
		execSvcSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userID)
		execSvcSQL(t, "DELETE FROM profiles WHERE user_id = $1", userID)
	})
}

func TestProfileService_UpdateOnboarding_MarksCompleted(t *testing.T) {
	skipIfNoSvcTestDB(t)

	userID := newTestUserID(t)
	billingSvc := NewBillingService(database.GetPool(), NewNoOpBillingProvider())
	svc := NewProfileService(database.GetPool(), billingSvc, nil)

	profile, err := svc.UpdateOnboarding(context.Background(), userID, models.UpdateOnboardingRequest{
		Country:        "mx",
		BrokerPresetID: "gbm-mexico",
	})
	if err != nil {
		t.Fatalf("UpdateOnboarding: %v", err)
	}

	if profile.Country != "mx" {
		t.Errorf("Country = %q, want %q", profile.Country, "mx")
	}
	if profile.BrokerPresetID == nil || *profile.BrokerPresetID != "gbm-mexico" {
		t.Errorf("BrokerPresetID = %v, want %q", profile.BrokerPresetID, "gbm-mexico")
	}
	if !profile.OnboardingCompleted {
		t.Error("OnboardingCompleted = false, want true")
	}
	if profile.OnboardingStep != "completed" {
		t.Errorf("OnboardingStep = %q, want %q", profile.OnboardingStep, "completed")
	}

	t.Cleanup(func() {
		execSvcSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userID)
		execSvcSQL(t, "DELETE FROM profiles WHERE user_id = $1", userID)
	})
}

func newTestProfileService(t *testing.T) *ProfileService {
	t.Helper()
	billingSvc := NewBillingService(database.GetPool(), NewNoOpBillingProvider())
	return NewProfileService(database.GetPool(), billingSvc, NewBrokerService(database.GetPool()))
}

func TestProfileService_UpdateProfile_PreservesOnboardingCompleted(t *testing.T) {
	skipIfNoSvcTestDB(t)

	userID := newTestUserID(t)
	svc := newTestProfileService(t)

	if _, err := svc.UpdateOnboarding(context.Background(), userID, models.UpdateOnboardingRequest{
		Country:        "co",
		BrokerPresetID: "hapi-colombia",
	}); err != nil {
		t.Fatalf("UpdateOnboarding: %v", err)
	}

	profile, err := svc.UpdateProfile(context.Background(), userID, models.UpdateProfileRequest{
		Country:        "mx",
		BrokerPresetID: "hapi-colombia",
	})
	if err != nil {
		t.Fatalf("UpdateProfile: %v", err)
	}

	if profile.Country != "mx" {
		t.Errorf("Country = %q, want %q", profile.Country, "mx")
	}
	if profile.BrokerPresetID == nil || *profile.BrokerPresetID != "hapi-colombia" {
		t.Errorf("BrokerPresetID = %v, want %q", profile.BrokerPresetID, "hapi-colombia")
	}
	if !profile.OnboardingCompleted {
		t.Error("OnboardingCompleted = false, want true")
	}
	if profile.OnboardingStep != "completed" {
		t.Errorf("OnboardingStep = %q, want %q", profile.OnboardingStep, "completed")
	}

	t.Cleanup(func() {
		execSvcSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userID)
		execSvcSQL(t, "DELETE FROM profiles WHERE user_id = $1", userID)
	})
}

func TestProfileService_UpdateProfile_CreatesBrokerWhenPresetChanges(t *testing.T) {
	skipIfNoSvcTestDB(t)

	userID := newTestUserID(t)
	svc := newTestProfileService(t)
	brokerSvc := NewBrokerService(database.GetPool())

	if _, err := svc.UpdateOnboarding(context.Background(), userID, models.UpdateOnboardingRequest{
		Country:        "co",
		BrokerPresetID: "hapi-colombia",
	}); err != nil {
		t.Fatalf("UpdateOnboarding: %v", err)
	}
	if _, err := brokerSvc.GetOrCreateBrokerFromPreset(context.Background(), userID, "hapi-colombia"); err != nil {
		t.Fatalf("seed hapi broker: %v", err)
	}

	profile, err := svc.UpdateProfile(context.Background(), userID, models.UpdateProfileRequest{
		Country:        "mx",
		BrokerPresetID: "gbm-mexico",
	})
	if err != nil {
		t.Fatalf("UpdateProfile: %v", err)
	}

	if profile.BrokerPresetID == nil || *profile.BrokerPresetID != "gbm-mexico" {
		t.Errorf("BrokerPresetID = %v, want %q", profile.BrokerPresetID, "gbm-mexico")
	}
	if !profile.OnboardingCompleted {
		t.Error("OnboardingCompleted = false, want true")
	}

	brokers, err := brokerSvc.ListBrokers(context.Background(), userID)
	if err != nil {
		t.Fatalf("ListBrokers: %v", err)
	}
	if len(brokers) != 2 {
		t.Fatalf("broker count = %d, want 2", len(brokers))
	}

	t.Cleanup(func() {
		execSvcSQL(t, "DELETE FROM brokers WHERE user_id = $1", userID)
		execSvcSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userID)
		execSvcSQL(t, "DELETE FROM profiles WHERE user_id = $1", userID)
	})
}

func TestProfileService_UpdateProfile_DoesNotAffectOtherUsers(t *testing.T) {
	skipIfNoSvcTestDB(t)

	userA := newTestUserID(t)
	userB := newTestUserID(t)
	svc := newTestProfileService(t)

	if _, err := svc.UpdateOnboarding(context.Background(), userA, models.UpdateOnboardingRequest{
		Country:        "co",
		BrokerPresetID: "hapi-colombia",
	}); err != nil {
		t.Fatalf("UpdateOnboarding userA: %v", err)
	}

	if _, err := svc.UpdateProfile(context.Background(), userA, models.UpdateProfileRequest{
		Country:        "mx",
		BrokerPresetID: "gbm-mexico",
	}); err != nil {
		t.Fatalf("UpdateProfile userA: %v", err)
	}

	profileB, err := svc.GetOrCreateProfile(context.Background(), userB)
	if err != nil {
		t.Fatalf("GetOrCreateProfile userB: %v", err)
	}
	if profileB.Country != "co" {
		t.Errorf("userB Country = %q, want %q", profileB.Country, "co")
	}
	if profileB.OnboardingCompleted {
		t.Error("userB OnboardingCompleted = true after userA profile update")
	}

	t.Cleanup(func() {
		execSvcSQL(t, "DELETE FROM brokers WHERE user_id = $1", userA)
		execSvcSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userA)
		execSvcSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userB)
		execSvcSQL(t, "DELETE FROM profiles WHERE user_id = $1", userA)
		execSvcSQL(t, "DELETE FROM profiles WHERE user_id = $1", userB)
	})
}

func TestProfileService_UpdateOnboarding_DoesNotAffectOtherUsers(t *testing.T) {
	skipIfNoSvcTestDB(t)

	userA := newTestUserID(t)
	userB := newTestUserID(t)
	billingSvc := NewBillingService(database.GetPool(), NewNoOpBillingProvider())
	svc := NewProfileService(database.GetPool(), billingSvc, nil)

	if _, err := svc.UpdateOnboarding(context.Background(), userA, models.UpdateOnboardingRequest{
		Country:        "co",
		BrokerPresetID: "hapi-colombia",
	}); err != nil {
		t.Fatalf("UpdateOnboarding userA: %v", err)
	}

	profileB, err := svc.GetOrCreateProfile(context.Background(), userB)
	if err != nil {
		t.Fatalf("GetOrCreateProfile userB: %v", err)
	}
	if profileB.OnboardingCompleted {
		t.Error("userB OnboardingCompleted = true after userA completed")
	}

	t.Cleanup(func() {
		execSvcSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userA)
		execSvcSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userB)
		execSvcSQL(t, "DELETE FROM profiles WHERE user_id = $1", userA)
		execSvcSQL(t, "DELETE FROM profiles WHERE user_id = $1", userB)
	})
}
