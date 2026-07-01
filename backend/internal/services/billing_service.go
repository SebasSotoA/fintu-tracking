package services

import (
	"context"
	"errors"
	"fmt"

	"fintu-tracking-backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrSubscriptionNotFound is returned when a subscription does not exist or does
// not belong to the requesting user.
var ErrSubscriptionNotFound = errors.New("subscription not found")

// BillingService manages subscription plans and per-user subscriptions.
type BillingService struct {
	pool     *pgxpool.Pool
	provider BillingProvider
}

// NewBillingService creates a BillingService backed by the given DB pool and provider.
func NewBillingService(pool *pgxpool.Pool, provider BillingProvider) *BillingService {
	return &BillingService{pool: pool, provider: provider}
}

// ListPlans returns public plans plus the user's current plan (so non-public plans
// like closed_beta are visible to subscribers).
func (s *BillingService) ListPlans(ctx context.Context, userID string) ([]models.Plan, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, name, description, tier, price_monthly_usd::text, price_annual_usd::text,
		       currency, features, is_public, created_at, updated_at
		FROM plans
		WHERE is_public = true
		   OR id = (SELECT plan_id FROM subscriptions WHERE user_id = $1)
		ORDER BY tier, id
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("listing plans: %w", err)
	}
	defer rows.Close()

	plans, err := pgx.CollectRows(rows, pgx.RowToStructByName[models.Plan])
	if err != nil {
		return nil, fmt.Errorf("collecting plans: %w", err)
	}
	return plans, nil
}

// GetSubscription returns the user's current subscription with plan details.
func (s *BillingService) GetSubscription(ctx context.Context, userID string) (*models.Subscription, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT s.id, s.user_id, s.plan_id, s.status, s.billing_provider, s.provider_subscription_id,
		       s.trial_start, s.trial_end, s.current_period_start, s.current_period_end,
		       s.cancel_at_period_end, s.created_at, s.updated_at,
		       p.id AS plan_id, p.name, p.description, p.tier,
		       p.price_monthly_usd::text, p.price_annual_usd::text, p.currency,
		       p.features, p.is_public, p.created_at, p.updated_at
		FROM subscriptions s
		JOIN plans p ON p.id = s.plan_id
		WHERE s.user_id = $1
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("fetching subscription: %w", err)
	}
	defer rows.Close()

	sub, err := pgx.CollectOneRow(rows, func(row pgx.CollectableRow) (models.Subscription, error) {
		var subscription models.Subscription
		var plan models.Plan
		if err := row.Scan(
			&subscription.ID, &subscription.UserID, &subscription.PlanID, &subscription.Status,
			&subscription.BillingProvider, &subscription.ProviderSubscriptionID,
			&subscription.TrialStart, &subscription.TrialEnd,
			&subscription.CurrentPeriodStart, &subscription.CurrentPeriodEnd,
			&subscription.CancelAtPeriodEnd, &subscription.CreatedAt, &subscription.UpdatedAt,
			&plan.ID, &plan.Name, &plan.Description, &plan.Tier,
			&plan.PriceMonthlyUSD, &plan.PriceAnnualUSD, &plan.Currency,
			&plan.Features, &plan.IsPublic, &plan.CreatedAt, &plan.UpdatedAt,
		); err != nil {
			return models.Subscription{}, err
		}
		subscription.Plan = &plan
		return subscription, nil
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("collecting subscription: %w", err)
	}
	return &sub, nil
}

// GetOrCreateClosedBetaSubscription ensures the user has an active closed_beta
// subscription. It is called automatically during profile creation/lookup.
func (s *BillingService) GetOrCreateClosedBetaSubscription(ctx context.Context, userID string) (*models.Subscription, error) {
	existing, err := s.GetSubscription(ctx, userID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		if existing.PlanID == models.PlanIDClosedBeta && existing.Status == models.SubscriptionStatusCanceled {
			return s.reactivateClosedBetaSubscription(ctx, userID)
		}
		return existing, nil
	}

	rows, err := s.pool.Query(ctx, `
		INSERT INTO subscriptions (user_id, plan_id, status, billing_provider)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (user_id) DO UPDATE SET
		  status = CASE
		    WHEN subscriptions.plan_id = $2 AND subscriptions.status = $5
		    THEN EXCLUDED.status
		    ELSE subscriptions.status
		  END,
		  cancel_at_period_end = CASE
		    WHEN subscriptions.plan_id = $2 AND subscriptions.status = $5
		    THEN false
		    ELSE subscriptions.cancel_at_period_end
		  END,
		  updated_at = NOW()
		RETURNING id, user_id, plan_id, status, billing_provider, provider_subscription_id,
		          trial_start, trial_end, current_period_start, current_period_end,
		          cancel_at_period_end, created_at, updated_at
	`, userID, models.PlanIDClosedBeta, models.SubscriptionStatusActive, models.BillingProviderManual, models.SubscriptionStatusCanceled)
	if err != nil {
		return nil, fmt.Errorf("creating closed_beta subscription: %w", err)
	}
	defer rows.Close()

	subscription, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[models.Subscription])
	if err != nil {
		return nil, fmt.Errorf("collecting closed_beta subscription: %w", err)
	}

	if err := s.updateProfileCache(ctx, userID, subscription.PlanID, subscription.Status); err != nil {
		return nil, err
	}

	return &subscription, nil
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
	var priceMonthly, priceAnnual *float64
	if err := s.pool.QueryRow(ctx, `SELECT price_monthly_usd, price_annual_usd FROM plans WHERE id = $1`, req.PlanID).Scan(&priceMonthly, &priceAnnual); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("plan %q does not exist", req.PlanID)
		}
		return nil, fmt.Errorf("checking plan: %w", err)
	}
	if (priceMonthly != nil && *priceMonthly > 0) || (priceAnnual != nil && *priceAnnual > 0) {
		return nil, fmt.Errorf("paid plans cannot be activated with the manual billing provider")
	}

	providerSubID, err := s.provider.CreateSubscription(ctx, userID, req.PlanID)
	if err != nil {
		return nil, fmt.Errorf("creating provider subscription: %w", err)
	}

	rows, err := s.pool.Query(ctx, `
		INSERT INTO subscriptions (user_id, plan_id, status, billing_provider, provider_subscription_id)
		VALUES ($1, $2, 'active', $3, $4)
		ON CONFLICT (user_id) DO UPDATE SET
		  plan_id = EXCLUDED.plan_id,
		  status = EXCLUDED.status,
		  billing_provider = EXCLUDED.billing_provider,
		  provider_subscription_id = EXCLUDED.provider_subscription_id,
		  cancel_at_period_end = false,
		  updated_at = NOW()
		RETURNING id, user_id, plan_id, status, billing_provider, provider_subscription_id,
		          trial_start, trial_end, current_period_start, current_period_end,
		          cancel_at_period_end, created_at, updated_at
	`, userID, req.PlanID, req.BillingProvider, providerSubID)
	if err != nil {
		return nil, fmt.Errorf("creating subscription: %w", err)
	}
	defer rows.Close()

	subscription, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[models.Subscription])
	if err != nil {
		return nil, fmt.Errorf("collecting subscription: %w", err)
	}

	if err := s.updateProfileCache(ctx, userID, subscription.PlanID, subscription.Status); err != nil {
		return nil, err
	}

	return &subscription, nil
}

// CancelSubscription cancels the user's subscription and updates the profile cache.
// For the manual provider (Milestone 1 closed_beta), access stays active until period
// end: status remains active and cancel_at_period_end is set.
func (s *BillingService) CancelSubscription(ctx context.Context, userID, subscriptionID string) (*models.Subscription, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, provider_subscription_id, billing_provider
		FROM subscriptions
		WHERE id = $1 AND user_id = $2
	`, subscriptionID, userID)
	if err != nil {
		return nil, fmt.Errorf("fetching subscription for cancel: %w", err)
	}
	defer rows.Close()

	sub, err := pgx.CollectOneRow(rows, func(row pgx.CollectableRow) (models.Subscription, error) {
		var s models.Subscription
		err := row.Scan(&s.ID, &s.ProviderSubscriptionID, &s.BillingProvider)
		return s, err
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSubscriptionNotFound
		}
		return nil, fmt.Errorf("collecting subscription for cancel: %w", err)
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

	updateRows, err := s.pool.Query(ctx, `
		UPDATE subscriptions
		SET status = $3, cancel_at_period_end = true, updated_at = NOW()
		WHERE id = $1 AND user_id = $2
		RETURNING id, user_id, plan_id, status, billing_provider, provider_subscription_id,
		          trial_start, trial_end, current_period_start, current_period_end,
		          cancel_at_period_end, created_at, updated_at
	`, subscriptionID, userID, cancelStatus)
	if err != nil {
		return nil, fmt.Errorf("canceling subscription: %w", err)
	}
	defer updateRows.Close()

	subscription, err := pgx.CollectOneRow(updateRows, pgx.RowToStructByName[models.Subscription])
	if err != nil {
		return nil, fmt.Errorf("collecting canceled subscription: %w", err)
	}

	if err := s.updateProfileCache(ctx, userID, subscription.PlanID, subscription.Status); err != nil {
		return nil, err
	}

	return &subscription, nil
}

// updateProfileCache keeps denormalized plan/status columns in profiles in sync
// with the subscriptions table so the frontend can gate routes with a single /api/me call.
func (s *BillingService) updateProfileCache(ctx context.Context, userID, planID, status string) error {
	if _, err := s.pool.Exec(ctx, `
		UPDATE profiles
		SET plan_id = $2, subscription_status = $3, updated_at = NOW()
		WHERE user_id = $1
	`, userID, planID, status); err != nil {
		return fmt.Errorf("updating profile subscription cache: %w", err)
	}
	return nil
}

// HasActiveSubscription reports whether the user has an active or trialing subscription.
// It is used by the plan middleware for fast gating.
func (s *BillingService) HasActiveSubscription(ctx context.Context, userID string) (bool, error) {
	var active bool
	if err := s.pool.QueryRow(ctx, `
		SELECT EXISTS(
		  SELECT 1 FROM subscriptions
		  WHERE user_id = $1 AND status IN ($2, $3)
		)
	`, userID, models.SubscriptionStatusActive, models.SubscriptionStatusTrialing).Scan(&active); err != nil {
		return false, fmt.Errorf("checking active subscription: %w", err)
	}
	return active, nil
}

func (s *BillingService) reactivateClosedBetaSubscription(ctx context.Context, userID string) (*models.Subscription, error) {
	rows, err := s.pool.Query(ctx, `
		UPDATE subscriptions
		SET status = $3, cancel_at_period_end = false, updated_at = NOW()
		WHERE user_id = $1 AND plan_id = $2
		RETURNING id, user_id, plan_id, status, billing_provider, provider_subscription_id,
		          trial_start, trial_end, current_period_start, current_period_end,
		          cancel_at_period_end, created_at, updated_at
	`, userID, models.PlanIDClosedBeta, models.SubscriptionStatusActive)
	if err != nil {
		return nil, fmt.Errorf("reactivating closed_beta subscription: %w", err)
	}
	defer rows.Close()

	subscription, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[models.Subscription])
	if err != nil {
		return nil, fmt.Errorf("collecting reactivated closed_beta subscription: %w", err)
	}

	if err := s.updateProfileCache(ctx, userID, subscription.PlanID, subscription.Status); err != nil {
		return nil, err
	}

	return &subscription, nil
}
