package services

import (
	"context"
	"errors"
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

func TestBillingService_CancelSubscription_Isolation(t *testing.T) {
	skipIfNoSvcTestDB(t)

	userA := newTestUserID(t)
	userB := newTestUserID(t)
	svc := NewBillingService(database.GetPool(), NewNoOpBillingProvider())

	if _, err := svc.GetOrCreateClosedBetaSubscription(context.Background(), userA); err != nil {
		t.Fatalf("create subscription A: %v", err)
	}

	var subID string
	if err := database.GetPool().QueryRow(context.Background(),
		"SELECT id FROM subscriptions WHERE user_id = $1", userA).Scan(&subID); err != nil {
		t.Fatalf("fetch subscription id: %v", err)
	}

	_, err := svc.CancelSubscription(context.Background(), userB, subID)
	if !errors.Is(err, ErrSubscriptionNotFound) {
		t.Fatalf("CancelSubscription = %v, want ErrSubscriptionNotFound", err)
	}

	t.Cleanup(func() {
		execSvcSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userA)
		execSvcSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userB)
	})
}

func TestBillingService_CancelSubscription_ManualKeepsActiveWithCancelAtPeriodEnd(t *testing.T) {
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
	if canceled.Status != models.SubscriptionStatusActive {
		t.Errorf("Status = %q, want %q (manual provider keeps access until period end)", canceled.Status, models.SubscriptionStatusActive)
	}
	if !canceled.CancelAtPeriodEnd {
		t.Error("CancelAtPeriodEnd = false, want true")
	}

	refreshed, err := profileSvc.GetProfile(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetProfile: %v", err)
	}
	if refreshed.SubscriptionStatus == nil || *refreshed.SubscriptionStatus != models.SubscriptionStatusActive {
		t.Errorf("SubscriptionStatus = %v, want %q", refreshed.SubscriptionStatus, models.SubscriptionStatusActive)
	}

	t.Cleanup(func() {
		execSvcSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userID)
		execSvcSQL(t, "DELETE FROM profiles WHERE user_id = $1", userID)
	})
}

func TestBillingService_GetOrCreateClosedBetaSubscription_ReactivatesCanceled(t *testing.T) {
	skipIfNoSvcTestDB(t)

	userID := newTestUserID(t)
	svc := NewBillingService(database.GetPool(), NewNoOpBillingProvider())
	profileSvc := NewProfileService(database.GetPool(), svc)

	sub, err := svc.GetOrCreateClosedBetaSubscription(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetOrCreateClosedBetaSubscription: %v", err)
	}

	if _, err := profileSvc.GetOrCreateProfile(context.Background(), userID); err != nil {
		t.Fatalf("GetOrCreateProfile: %v", err)
	}

	canceled, err := svc.CancelSubscription(context.Background(), userID, sub.ID)
	if err != nil {
		t.Fatalf("CancelSubscription: %v", err)
	}
	if canceled.Status != models.SubscriptionStatusActive {
		t.Fatalf("precondition: canceled status = %q, want active for manual provider", canceled.Status)
	}

	execSvcSQL(t, `
		UPDATE subscriptions
		SET status = $2, cancel_at_period_end = true
		WHERE user_id = $1
	`, userID, models.SubscriptionStatusCanceled)

	reactivated, err := svc.GetOrCreateClosedBetaSubscription(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetOrCreateClosedBetaSubscription after cancel: %v", err)
	}
	if reactivated.Status != models.SubscriptionStatusActive {
		t.Errorf("Status = %q, want %q", reactivated.Status, models.SubscriptionStatusActive)
	}
	if reactivated.CancelAtPeriodEnd {
		t.Error("CancelAtPeriodEnd = true, want false after reactivation")
	}
	if reactivated.PlanID != models.PlanIDClosedBeta {
		t.Errorf("PlanID = %q, want %q", reactivated.PlanID, models.PlanIDClosedBeta)
	}

	var profileStatus string
	if err := database.GetPool().QueryRow(context.Background(),
		"SELECT subscription_status FROM profiles WHERE user_id = $1", userID).Scan(&profileStatus); err != nil {
		t.Fatalf("fetch profile status: %v", err)
	}
	if profileStatus != models.SubscriptionStatusActive {
		t.Errorf("profile subscription_status = %q, want %q", profileStatus, models.SubscriptionStatusActive)
	}

	t.Cleanup(func() {
		execSvcSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userID)
		execSvcSQL(t, "DELETE FROM profiles WHERE user_id = $1", userID)
	})
}

func TestBillingService_CreateSubscription_ReactivatesCanceledClosedBeta(t *testing.T) {
	skipIfNoSvcTestDB(t)

	userID := newTestUserID(t)
	svc := NewBillingService(database.GetPool(), NewNoOpBillingProvider())

	sub, err := svc.GetOrCreateClosedBetaSubscription(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetOrCreateClosedBetaSubscription: %v", err)
	}

	if _, err := svc.CancelSubscription(context.Background(), userID, sub.ID); err != nil {
		t.Fatalf("CancelSubscription: %v", err)
	}

	execSvcSQL(t, `
		UPDATE subscriptions
		SET status = $2
		WHERE user_id = $1
	`, userID, models.SubscriptionStatusCanceled)

	reactivated, err := svc.CreateSubscription(context.Background(), userID, models.CreateSubscriptionRequest{
		PlanID:          models.PlanIDClosedBeta,
		BillingProvider: models.BillingProviderManual,
	})
	if err != nil {
		t.Fatalf("CreateSubscription: %v", err)
	}
	if reactivated.Status != models.SubscriptionStatusActive {
		t.Errorf("Status = %q, want %q", reactivated.Status, models.SubscriptionStatusActive)
	}
	if reactivated.CancelAtPeriodEnd {
		t.Error("CancelAtPeriodEnd = true, want false after reactivation")
	}

	t.Cleanup(func() {
		execSvcSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userID)
	})
}

func TestBillingService_GetOrCreateClosedBetaSubscription_DoesNotReactivatePaidPlan(t *testing.T) {
	skipIfNoSvcTestDB(t)

	userID := newTestUserID(t)
	svc := NewBillingService(database.GetPool(), NewNoOpBillingProvider())

	execSvcSQL(t, `
		INSERT INTO subscriptions (user_id, plan_id, status, billing_provider)
		VALUES ($1, $2, $3, $4)
	`, userID, models.PlanIDProMonthly, models.SubscriptionStatusCanceled, "wompi")

	sub, err := svc.GetOrCreateClosedBetaSubscription(context.Background(), userID)
	if err != nil {
		t.Fatalf("GetOrCreateClosedBetaSubscription: %v", err)
	}
	if sub.PlanID != models.PlanIDProMonthly {
		t.Errorf("PlanID = %q, want %q (must not overwrite paid plan)", sub.PlanID, models.PlanIDProMonthly)
	}
	if sub.Status != models.SubscriptionStatusCanceled {
		t.Errorf("Status = %q, want %q (must not reactivate paid plan)", sub.Status, models.SubscriptionStatusCanceled)
	}

	t.Cleanup(func() {
		execSvcSQL(t, "DELETE FROM subscriptions WHERE user_id = $1", userID)
	})
}
