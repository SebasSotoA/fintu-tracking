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
	return uuid.New().String()
}

func TestProfileService_GetOrCreateProfile_CreatesDefaultForNewUser(t *testing.T) {
	skipIfNoSvcTestDB(t)

	userID := newTestUserID(t)
	svc := NewProfileService(database.GetPool())

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

	t.Cleanup(func() {
		execSvcSQL(t, "DELETE FROM profiles WHERE user_id = $1", userID)
	})
}

func TestProfileService_UpdateOnboarding_MarksCompleted(t *testing.T) {
	skipIfNoSvcTestDB(t)

	userID := newTestUserID(t)
	svc := NewProfileService(database.GetPool())

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
		execSvcSQL(t, "DELETE FROM profiles WHERE user_id = $1", userID)
	})
}

func TestProfileService_UpdateOnboarding_DoesNotAffectOtherUsers(t *testing.T) {
	skipIfNoSvcTestDB(t)

	userA := newTestUserID(t)
	userB := newTestUserID(t)
	svc := NewProfileService(database.GetPool())

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
		execSvcSQL(t, "DELETE FROM profiles WHERE user_id = $1", userA)
		execSvcSQL(t, "DELETE FROM profiles WHERE user_id = $1", userB)
	})
}
