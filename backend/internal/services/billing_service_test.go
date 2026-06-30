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

	if sub.PlanID != "closed_beta" {
		t.Errorf("PlanID = %q, want %q", sub.PlanID, "closed_beta")
	}
	if sub.Status != "active" {
		t.Errorf("Status = %q, want %q", sub.Status, "active")
	}
	if sub.BillingProvider != "manual" {
		t.Errorf("BillingProvider = %q, want %q", sub.BillingProvider, "manual")
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

func TestBillingService_CreateSubscription_ManualProviderOnly(t *testing.T) {
	skipIfNoSvcTestDB(t)

	userID := newTestUserID(t)
	svc := NewBillingService(database.GetPool(), NewNoOpBillingProvider())

	if _, err := svc.GetOrCreateClosedBetaSubscription(context.Background(), userID); err != nil {
		t.Fatalf("create closed_beta subscription: %v", err)
	}

	_, err := svc.CreateSubscription(context.Background(), userID, models.CreateSubscriptionRequest{
		PlanID:          "pro_monthly",
		BillingProvider: "wompi",
	})
	if err == nil {
		t.Fatal("expected error for non-manual provider in Milestone 1")
	}

	sub, err := svc.CreateSubscription(context.Background(), userID, models.CreateSubscriptionRequest{
		PlanID:          "pro_monthly",
		BillingProvider: "manual",
	})
	if err != nil {
		t.Fatalf("CreateSubscription manual: %v", err)
	}
	if sub.PlanID != "pro_monthly" {
		t.Errorf("PlanID = %q, want %q", sub.PlanID, "pro_monthly")
	}
	if sub.Status != "active" {
		t.Errorf("Status = %q, want %q", sub.Status, "active")
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
	if profile.PlanID == nil || *profile.PlanID != "closed_beta" {
		t.Fatalf("PlanID = %v, want %q", profile.PlanID, "closed_beta")
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
	if canceled.Status != "canceled" {
		t.Errorf("Status = %q, want %q", canceled.Status, "canceled")
	}

	refreshed, err := profileSvc.GetProfile(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetProfile: %v", err)
	}
	if refreshed.SubscriptionStatus == nil || *refreshed.SubscriptionStatus != "canceled" {
		t.Errorf("SubscriptionStatus = %v, want %q", refreshed.SubscriptionStatus, "canceled")
	}

	t.Cleanup(func() {
		execSvcSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userID)
		execSvcSQL(t, "DELETE FROM profiles WHERE user_id = $1", userID)
	})
}
