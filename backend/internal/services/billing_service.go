package services

import (
	"context"
	"errors"
	"fmt"
	"strconv"

	"fintu-tracking-backend/internal/models"
)

// ErrSubscriptionNotFound is returned when a subscription does not exist or does
// not belong to the requesting user.
var ErrSubscriptionNotFound = errors.New("subscription not found")

// BillingService manages subscription plans and per-user subscriptions.
type BillingService struct {
	repo     BillingRepository
	provider BillingProvider
}

// NewBillingService creates a BillingService backed by the given repository and provider.
func NewBillingService(repo BillingRepository, provider BillingProvider) *BillingService {
	return &BillingService{repo: repo, provider: provider}
}

// ListPlans returns public plans plus the user's current plan (so non-public plans
// like closed_beta are visible to subscribers).
func (s *BillingService) ListPlans(ctx context.Context, userID string) ([]models.Plan, error) {
	return s.repo.ListPlans(ctx, userID)
}

// GetSubscription returns the user's current subscription with plan details.
func (s *BillingService) GetSubscription(ctx context.Context, userID string) (*models.Subscription, error) {
	return s.repo.GetSubscription(ctx, userID)
}

// GetOrCreateClosedBetaSubscription ensures the user has an active closed_beta
// subscription. It is called automatically during profile creation/lookup.
func (s *BillingService) GetOrCreateClosedBetaSubscription(ctx context.Context, userID string) (*models.Subscription, error) {
	existing, err := s.repo.GetSubscription(ctx, userID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		if existing.PlanID == models.PlanIDClosedBeta && existing.Status == models.SubscriptionStatusCanceled {
			return s.repo.ReactivateClosedBetaSubscription(ctx, userID)
		}
		return existing, nil
	}
	return s.repo.CreateClosedBetaSubscription(ctx, userID)
}

// CreateSubscription creates or updates a user's subscription with the chosen plan.
// In Milestone 1 only the manual provider is supported, and paid plans cannot be
// activated through it.
func (s *BillingService) CreateSubscription(ctx context.Context, userID string, req models.CreateSubscriptionRequest) (*models.Subscription, error) {
	if req.PlanID == "" {
		return nil, fmt.Errorf("plan_id is required")
	}
	if req.BillingProvider == "" {
		return nil, fmt.Errorf("billing_provider is required")
	}

	// Milestone 1 only supports manual provider.
	if req.BillingProvider != models.BillingProviderManual {
		return nil, fmt.Errorf("billing provider %q is not supported in Milestone 1", req.BillingProvider)
	}

	// Verify the plan exists and whether it is a paid plan.
	plan, err := s.repo.GetPlanByID(ctx, req.PlanID)
	if err != nil {
		return nil, fmt.Errorf("checking plan: %w", err)
	}
	if plan == nil {
		return nil, fmt.Errorf("plan %q does not exist", req.PlanID)
	}
	if planHasPaidPrice(plan) {
		return nil, fmt.Errorf("paid plans cannot be activated with the manual billing provider")
	}

	providerSubID, err := s.provider.CreateSubscription(ctx, userID, req.PlanID)
	if err != nil {
		return nil, fmt.Errorf("creating provider subscription: %w", err)
	}

	return s.repo.CreateSubscription(ctx, userID, req.PlanID, req.BillingProvider, providerSubID)
}

// CancelSubscription cancels the user's subscription and updates the profile cache.
// For the manual provider (Milestone 1 closed_beta), access stays active until period
// end: status remains active and cancel_at_period_end is set.
func (s *BillingService) CancelSubscription(ctx context.Context, userID, subscriptionID string) (*models.Subscription, error) {
	sub, err := s.repo.GetSubscriptionForCancel(ctx, userID, subscriptionID)
	if err != nil {
		return nil, fmt.Errorf("fetching subscription for cancel: %w", err)
	}
	if sub == nil {
		return nil, ErrSubscriptionNotFound
	}

	if sub.ProviderSubscriptionID != nil && *sub.ProviderSubscriptionID != "" {
		if err := s.provider.CancelSubscription(ctx, *sub.ProviderSubscriptionID); err != nil {
			return nil, fmt.Errorf("canceling provider subscription: %w", err)
		}
	}

	cancelStatus := models.SubscriptionStatusCanceled
	if sub.BillingProvider == models.BillingProviderManual {
		cancelStatus = models.SubscriptionStatusActive
	}

	return s.repo.CancelSubscription(ctx, userID, subscriptionID, cancelStatus)
}

// HasActiveSubscription reports whether the user has an active or trialing subscription.
// It is used by the plan middleware for fast gating.
func (s *BillingService) HasActiveSubscription(ctx context.Context, userID string) (bool, error) {
	return s.repo.HasActiveSubscription(ctx, userID)
}

// planHasPaidPrice reports whether the plan has a positive monthly or annual price.
// Price columns come back as text (NUMERIC::text); nil or non-positive values are free.
func planHasPaidPrice(plan *models.Plan) bool {
	return priceIsPositive(plan.PriceMonthlyUSD) || priceIsPositive(plan.PriceAnnualUSD)
}

func priceIsPositive(s *string) bool {
	if s == nil || *s == "" {
		return false
	}
	v, err := strconv.ParseFloat(*s, 64)
	if err != nil {
		return false
	}
	return v > 0
}