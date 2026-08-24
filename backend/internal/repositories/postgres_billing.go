package repositories

import (
	"context"
	"errors"
	"fmt"

	"fintu-tracking-backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PostgresBillingRepository implements services.BillingRepository against Postgres.
type PostgresBillingRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresBillingRepository returns a BillingRepository backed by the given pool.
func NewPostgresBillingRepository(pool *pgxpool.Pool) *PostgresBillingRepository {
	return &PostgresBillingRepository{pool: pool}
}

// ListPlans returns public plans plus the user's current plan (so non-public plans
// like closed_beta are visible to subscribers).
func (r *PostgresBillingRepository) ListPlans(ctx context.Context, userID string) ([]models.Plan, error) {
	rows, err := r.pool.Query(ctx, `
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

	return pgx.CollectRows(rows, pgx.RowToStructByName[models.Plan])
}

// GetSubscription returns the user's current subscription with plan details, or
// nil,nil when the user has no subscription.
func (r *PostgresBillingRepository) GetSubscription(ctx context.Context, userID string) (*models.Subscription, error) {
	rows, err := r.pool.Query(ctx, `
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

// GetPlanByID returns the plan with the given id, or nil,nil when it does not exist.
func (r *PostgresBillingRepository) GetPlanByID(ctx context.Context, planID string) (*models.Plan, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, name, description, tier, price_monthly_usd::text, price_annual_usd::text,
		       currency, features, is_public, created_at, updated_at
		FROM plans
		WHERE id = $1
	`, planID)
	if err != nil {
		return nil, fmt.Errorf("querying plan: %w", err)
	}
	defer rows.Close()

	plan, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[models.Plan])
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("collecting plan: %w", err)
	}
	return &plan, nil
}

// CreateClosedBetaSubscription idempotently inserts an active closed_beta
// subscription for the user and syncs the profile cache.
func (r *PostgresBillingRepository) CreateClosedBetaSubscription(ctx context.Context, userID string) (*models.Subscription, error) {
	rows, err := r.pool.Query(ctx, `
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

	if err := r.updateProfileCache(ctx, userID, subscription.PlanID, subscription.Status); err != nil {
		return nil, err
	}

	return &subscription, nil
}

// ReactivateClosedBetaSubscription re-activates a canceled closed_beta subscription
// and syncs the profile cache.
func (r *PostgresBillingRepository) ReactivateClosedBetaSubscription(ctx context.Context, userID string) (*models.Subscription, error) {
	rows, err := r.pool.Query(ctx, `
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

	if err := r.updateProfileCache(ctx, userID, subscription.PlanID, subscription.Status); err != nil {
		return nil, err
	}

	return &subscription, nil
}

// CreateSubscription upserts the user's subscription to the given plan with an
// active status and syncs the profile cache.
func (r *PostgresBillingRepository) CreateSubscription(ctx context.Context, userID, planID, billingProvider, providerSubscriptionID string) (*models.Subscription, error) {
	rows, err := r.pool.Query(ctx, `
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
	`, userID, planID, billingProvider, providerSubscriptionID)
	if err != nil {
		return nil, fmt.Errorf("creating subscription: %w", err)
	}
	defer rows.Close()

	subscription, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[models.Subscription])
	if err != nil {
		return nil, fmt.Errorf("collecting subscription: %w", err)
	}

	if err := r.updateProfileCache(ctx, userID, subscription.PlanID, subscription.Status); err != nil {
		return nil, err
	}

	return &subscription, nil
}

// GetSubscriptionForCancel returns the subscription's provider id and billing
// provider for ownership verification, or nil,nil when no subscription with that
// id belongs to the user.
func (r *PostgresBillingRepository) GetSubscriptionForCancel(ctx context.Context, userID, subscriptionID string) (*models.Subscription, error) {
	rows, err := r.pool.Query(ctx, `
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
			return nil, nil
		}
		return nil, fmt.Errorf("collecting subscription for cancel: %w", err)
	}
	return &sub, nil
}

// CancelSubscription updates the subscription's status and cancel_at_period_end
// flag and syncs the profile cache.
func (r *PostgresBillingRepository) CancelSubscription(ctx context.Context, userID, subscriptionID, status string) (*models.Subscription, error) {
	rows, err := r.pool.Query(ctx, `
		UPDATE subscriptions
		SET status = $3, cancel_at_period_end = true, updated_at = NOW()
		WHERE id = $1 AND user_id = $2
		RETURNING id, user_id, plan_id, status, billing_provider, provider_subscription_id,
		          trial_start, trial_end, current_period_start, current_period_end,
		          cancel_at_period_end, created_at, updated_at
	`, subscriptionID, userID, status)
	if err != nil {
		return nil, fmt.Errorf("canceling subscription: %w", err)
	}
	defer rows.Close()

	subscription, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[models.Subscription])
	if err != nil {
		return nil, fmt.Errorf("collecting canceled subscription: %w", err)
	}

	if err := r.updateProfileCache(ctx, userID, subscription.PlanID, subscription.Status); err != nil {
		return nil, err
	}

	return &subscription, nil
}

// HasActiveSubscription reports whether the user has an active or trialing
// subscription.
func (r *PostgresBillingRepository) HasActiveSubscription(ctx context.Context, userID string) (bool, error) {
	var active bool
	if err := r.pool.QueryRow(ctx, `
		SELECT EXISTS(
		  SELECT 1 FROM subscriptions
		  WHERE user_id = $1 AND status IN ($2, $3)
		)
	`, userID, models.SubscriptionStatusActive, models.SubscriptionStatusTrialing).Scan(&active); err != nil {
		return false, fmt.Errorf("checking active subscription: %w", err)
	}
	return active, nil
}

// updateProfileCache keeps denormalized plan/status columns in profiles in sync
// with the subscriptions table so the frontend can gate routes with a single
// /api/me call.
func (r *PostgresBillingRepository) updateProfileCache(ctx context.Context, userID, planID, status string) error {
	if _, err := r.pool.Exec(ctx, `
		UPDATE profiles
		SET plan_id = $2, subscription_status = $3, updated_at = NOW()
		WHERE user_id = $1
	`, userID, planID, status); err != nil {
		return fmt.Errorf("updating profile subscription cache: %w", err)
	}
	return nil
}