package services

import (
	"context"

	"fintu-tracking-backend/internal/models"
)

// BillingRepository abstracts database operations for billing plans and
// subscriptions. Implementations live in the repositories package; the service
// holds this interface and applies business rules on top of the data it returns.
type BillingRepository interface {
	// ListPlans returns public plans plus the user's current plan so non-public
	// plans (e.g. closed_beta) are visible to subscribers.
	ListPlans(ctx context.Context, userID string) ([]models.Plan, error)

	// GetSubscription returns the user's current subscription with its plan
	// joined in, or nil,nil when the user has no subscription.
	GetSubscription(ctx context.Context, userID string) (*models.Subscription, error)

	// GetPlanByID returns the plan with the given id, or nil,nil when it does not
	// exist. Used by the service to validate plan selection and gate paid plans.
	GetPlanByID(ctx context.Context, planID string) (*models.Plan, error)

	// CreateClosedBetaSubscription idempotently inserts an active closed_beta
	// subscription for the user and syncs the profile cache. It is the data-layer
	// half of GetOrCreateClosedBetaSubscription; the service decides when to call
	// it versus ReactivateClosedBetaSubscription.
	CreateClosedBetaSubscription(ctx context.Context, userID string) (*models.Subscription, error)

	// ReactivateClosedBetaSubscription re-activates a canceled closed_beta
	// subscription and syncs the profile cache.
	ReactivateClosedBetaSubscription(ctx context.Context, userID string) (*models.Subscription, error)

	// CreateSubscription upserts the user's subscription to the given plan with an
	// active status and syncs the profile cache. The service is responsible for
	// validating the plan and calling the billing provider first.
	CreateSubscription(ctx context.Context, userID, planID, billingProvider, providerSubscriptionID string) (*models.Subscription, error)

	// GetSubscriptionForCancel returns the subscription's provider id and billing
	// provider for ownership verification, or nil,nil when no subscription with
	// that id belongs to the user.
	GetSubscriptionForCancel(ctx context.Context, userID, subscriptionID string) (*models.Subscription, error)

	// CancelSubscription updates the subscription's status and cancel_at_period_end
	// flag and syncs the profile cache. The status is chosen by the service based
	// on the billing provider (manual keeps access until period end).
	CancelSubscription(ctx context.Context, userID, subscriptionID, status string) (*models.Subscription, error)

	// HasActiveSubscription reports whether the user has an active or trialing
	// subscription. Used by the plan middleware for fast gating.
	HasActiveSubscription(ctx context.Context, userID string) (bool, error)
}