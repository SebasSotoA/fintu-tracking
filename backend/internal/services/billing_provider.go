package services

import (
	"context"
	"fmt"
)

// BillingProvider abstracts the external payment gateway used for subscriptions.
// Milestone 1 uses a no-op provider; later milestones will add Wompi, MercadoPago, etc.
type BillingProvider interface {
	// CreateSubscription starts a subscription in the external gateway and returns
	// the gateway's subscription identifier.
	CreateSubscription(ctx context.Context, userID, planID string) (providerSubscriptionID string, err error)

	// CancelSubscription cancels a subscription in the external gateway.
	CancelSubscription(ctx context.Context, providerSubscriptionID string) error
}

// NoOpBillingProvider is a provider that does nothing. It is used in Milestone 1
// when no live checkout is wired yet.
type NoOpBillingProvider struct{}

// NewNoOpBillingProvider creates a no-op billing provider.
func NewNoOpBillingProvider() *NoOpBillingProvider {
	return &NoOpBillingProvider{}
}

// CreateSubscription returns a sentinel provider ID so the subscription row can be
// reconciled back to a user and plan even when no live gateway is wired.
func (p *NoOpBillingProvider) CreateSubscription(_ context.Context, userID, planID string) (string, error) {
	return fmt.Sprintf("manual:%s:%s", planID, userID), nil
}

// CancelSubscription does nothing and returns no error.
func (p *NoOpBillingProvider) CancelSubscription(_ context.Context, _ string) error {
	return nil
}
