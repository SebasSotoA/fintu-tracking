package services

import (
	"context"
	"testing"

	"fintu-tracking-backend/internal/database"
	"fintu-tracking-backend/internal/models"
)

func TestBillingService_GetOrCreateClosedBetaSubscription_CreatesPlanAndSubscription(t *testing.T) {
	skipIfNoSvcTestDB(t)

	userID := newTestUserID(t)
	svc := NewBillingService(database.GetPool(), NewNoOpBillingProvider())

	sub, err := svc.GetOrCreateClosedBetaSubscription(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetOrCreateClosedBetaSubscription: %v", err)
	}

	if sub.PlanID != models.PlanIDClosedBeta {
		t.Errorf("PlanID = %q, want %q", sub.PlanID, models.PlanIDClosedBeta)
	}
	if sub.Status != models.SubscriptionStatusActive {
		t.Errorf("Status = %q, want %q", sub.Status, models.SubscriptionStatusActive)
	}
	if sub.BillingProvider != models.BillingProviderManual {
		t.Errorf("BillingProvider = %q, want %q", sub.BillingProvider, models.BillingProviderManual)
	}

	t.Cleanup(func() {
		execSvcSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userID)
	})
}

func TestBillingService_GetOrCreateClosedBetaSubscription_IsIdempotent(t *testing.T) {
	skipIfNoSvcTestDB(t)

	userID := newTestUserID(t)
	svc := NewBillingService(database.GetPool(), NewNoOpBillingProvider())

	sub1, err := svc.GetOrCreateClosedBetaSubscription(context.Background(), userID)
	if err != nil {
		t.Fatalf("first GetOrCreateClosedBetaSubscription: %v", err)
	}

	sub2, err := svc.GetOrCreateClosedBetaSubscription(context.Background(), userID)
	if err != nil {
		t.Fatalf("second GetOrCreateClosedBetaSubscription: %v", err)
	}

	if sub1.ID != sub2.ID {
		t.Errorf("ID changed: %q vs %q", sub1.ID, sub2.ID)
	}

	t.Cleanup(func() {
		execSvcSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userID)
	})
}

func TestBillingService_GetSubscription_Isolation(t *testing.T) {
	skipIfNoSvcTestDB(t)

	userA := newTestUserID(t)
	userB := newTestUserID(t)
	svc := NewBillingService(database.GetPool(), NewNoOpBillingProvider())

	if _, err := svc.GetOrCreateClosedBetaSubscription(context.Background(), userA); err != nil {
		t.Fatalf("create subscription A: %v", err)
	}

	subB, err := svc.GetSubscription(context.Background(), userB)
	if err != nil {
		t.Fatalf("GetSubscription B: %v", err)
	}
	if subB != nil {
		t.Error("userB should not see userA's subscription")
	}

	t.Cleanup(func() {
		execSvcSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userA)
		execSvcSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userB)
	})
}

func TestBillingService_CreateSubscription_ProviderAndPaidPlanGates(t *testing.T) {
	skipIfNoSvcTestDB(t)

	userID := newTestUserID(t)
	svc := NewBillingService(database.GetPool(), NewNoOpBillingProvider())

	if _, err := svc.GetOrCreateClosedBetaSubscription(context.Background(), userID); err != nil {
		t.Fatalf("create closed_beta subscription: %v", err)
	}

	_, err := svc.CreateSubscription(context.Background(), userID, models.CreateSubscriptionRequest{
		PlanID:          models.PlanIDProMonthly,
		BillingProvider: "wompi",
	})
	if err == nil {
		t.Fatal("expected error for non-manual provider in Milestone 1")
	}

	_, err = svc.CreateSubscription(context.Background(), userID, models.CreateSubscriptionRequest{
		PlanID:          models.PlanIDProMonthly,
		BillingProvider: models.BillingProviderManual,
	})
	if err == nil {
		t.Fatal("expected error for paid plan with manual provider")
	}

	sub, err := svc.CreateSubscription(context.Background(), userID, models.CreateSubscriptionRequest{
		PlanID:          models.PlanIDClosedBeta,
		BillingProvider: models.BillingProviderManual,
	})
	if err != nil {
		t.Fatalf("CreateSubscription manual closed_beta: %v", err)
	}
	if sub.PlanID != models.PlanIDClosedBeta {
		t.Errorf("PlanID = %q, want %q", sub.PlanID, models.PlanIDClosedBeta)
	}
	if sub.Status != models.SubscriptionStatusActive {
		t.Errorf("Status = %q, want %q", sub.Status, models.SubscriptionStatusActive)
	}

	t.Cleanup(func() {
		execSvcSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userID)
	})
}

func TestBillingService_ListPlans_IncludesCurrentPrivatePlan(t *testing.T) {
	skipIfNoSvcTestDB(t)

	userID := newTestUserID(t)
	svc := NewBillingService(database.GetPool(), NewNoOpBillingProvider())

	if _, err := svc.GetOrCreateClosedBetaSubscription(context.Background(), userID); err != nil {
		t.Fatalf("create closed_beta subscription: %v", err)
	}

	plans, err := svc.ListPlans(context.Background(), userID)
	if err != nil {
		t.Fatalf("ListPlans: %v", err)
	}

	hasPublic := false
	hasPrivate := false
	for _, p := range plans {
		if p.IsPublic {
			hasPublic = true
		}
		if p.ID == models.PlanIDClosedBeta {
			hasPrivate = true
		}
	}
	if !hasPublic {
		t.Error("expected at least one public plan")
	}
	if !hasPrivate {
		t.Errorf("expected current private plan %q to be included", models.PlanIDClosedBeta)
	}

	t.Cleanup(func() {
		execSvcSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userID)
	})
}

func TestBillingService_CreateSubscription_UnknownPlan(t *testing.T) {
	skipIfNoSvcTestDB(t)

	userID := newTestUserID(t)
	svc := NewBillingService(database.GetPool(), NewNoOpBillingProvider())

	_, err := svc.CreateSubscription(context.Background(), userID, models.CreateSubscriptionRequest{
		PlanID:          "nonexistent",
		BillingProvider: "manual",
	})
	if err == nil {
		t.Fatal("expected error for unknown plan")
	}
}

func TestBillingService_CancelSubscription_UpdatesProfile(t *testing.T) {
	skipIfNoSvcTestDB(t)

	userID := newTestUserID(t)
	svc := NewBillingService(database.GetPool(), NewNoOpBillingProvider())
	profileSvc := NewProfileService(database.GetPool(), svc)

	profile, err := profileSvc.GetOrCreateProfile(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetOrCreateProfile: %v", err)
	}
	if profile.PlanID == nil || *profile.PlanID != models.PlanIDClosedBeta {
		t.Fatalf("PlanID = %v, want %q", profile.PlanID, models.PlanIDClosedBeta)
	}

	var subID string
	if err := database.GetPool().QueryRow(context.Background(),
		"SELECT id FROM subscriptions WHERE user_id = $1", userID).Scan(&subID); err != nil {
		t.Fatalf("fetch subscription id: %v", err)
	}

	canceled, err := svc.CancelSubscription(context.Background(), userID, subID)
	if err != nil {
		t.Fatalf("CancelSubscription: %v", err)
	}
	if canceled.Status != models.SubscriptionStatusCanceled {
		t.Errorf("Status = %q, want %q", canceled.Status, models.SubscriptionStatusCanceled)
	}

	refreshed, err := profileSvc.GetProfile(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetProfile: %v", err)
	}
	if refreshed.SubscriptionStatus == nil || *refreshed.SubscriptionStatus != models.SubscriptionStatusCanceled {
		t.Errorf("SubscriptionStatus = %v, want %q", refreshed.SubscriptionStatus, models.SubscriptionStatusCanceled)
	}

	t.Cleanup(func() {
		execSvcSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userID)
		execSvcSQL(t, "DELETE FROM profiles WHERE user_id = $1", userID)
	})
}
