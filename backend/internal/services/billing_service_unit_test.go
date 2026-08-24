package services

import (
	"context"
	"errors"
	"testing"

	"fintu-tracking-backend/internal/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeBillingRepository is an in-memory BillingRepository for unit tests. It does
// not require a database and records calls so assertions can verify the service
// drove the data layer correctly.
type fakeBillingRepository struct {
	plans map[string]*models.Plan

	listPlans            []models.Plan
	listPlansUserID      string
	listPlansCalled      bool

	getSubscription      *models.Subscription
	getSubscriptionID    string
	getSubscriptionCalls int

	getPlanByID     map[string]*models.Plan
	getPlanByIDErr  error

	createClosedBeta      *models.Subscription
	createClosedBetaErr   error
	createClosedBetaCalls int

	reactivateClosedBeta      *models.Subscription
	reactivateClosedBetaErr   error
	reactivateClosedBetaCalls int

	createSubscription       *models.Subscription
	createSubscriptionErr    error
	createSubscriptionCalls  int
	createSubscriptionLast   createSubscriptionArgs
	profileCacheWrites       int

	getForCancel      *models.Subscription
	getForCancelErr   error
	getForCancelCalls  int
	getForCancelArgs   getForCancelArgs

	cancelSubscription      *models.Subscription
	cancelSubscriptionErr   error
	cancelSubscriptionCalls int
	cancelLastStatus        string
	cancelLastSubID         string

	hasActive      bool
	hasActiveErr   error
	hasActiveCalls int
}

type createSubscriptionArgs struct {
	userID                 string
	planID                 string
	billingProvider        string
	providerSubscriptionID string
}

type getForCancelArgs struct {
	userID         string
	subscriptionID string
}

func (f *fakeBillingRepository) ListPlans(ctx context.Context, userID string) ([]models.Plan, error) {
	f.listPlansCalled = true
	f.listPlansUserID = userID
	return f.listPlans, nil
}

func (f *fakeBillingRepository) GetSubscription(ctx context.Context, userID string) (*models.Subscription, error) {
	f.getSubscriptionCalls++
	f.getSubscriptionID = userID
	return f.getSubscription, nil
}

func (f *fakeBillingRepository) GetPlanByID(ctx context.Context, planID string) (*models.Plan, error) {
	if f.getPlanByIDErr != nil {
		return nil, f.getPlanByIDErr
	}
	return f.getPlanByID[planID], nil
}

func (f *fakeBillingRepository) CreateClosedBetaSubscription(ctx context.Context, userID string) (*models.Subscription, error) {
	f.createClosedBetaCalls++
	if f.createClosedBetaErr != nil {
		return nil, f.createClosedBetaErr
	}
	f.profileCacheWrites++
	return f.createClosedBeta, nil
}

func (f *fakeBillingRepository) ReactivateClosedBetaSubscription(ctx context.Context, userID string) (*models.Subscription, error) {
	f.reactivateClosedBetaCalls++
	if f.reactivateClosedBetaErr != nil {
		return nil, f.reactivateClosedBetaErr
	}
	f.profileCacheWrites++
	return f.reactivateClosedBeta, nil
}

func (f *fakeBillingRepository) CreateSubscription(ctx context.Context, userID, planID, billingProvider, providerSubscriptionID string) (*models.Subscription, error) {
	f.createSubscriptionCalls++
	f.createSubscriptionLast = createSubscriptionArgs{
		userID:                  userID,
		planID:                  planID,
		billingProvider:         billingProvider,
		providerSubscriptionID:  providerSubscriptionID,
	}
	if f.createSubscriptionErr != nil {
		return nil, f.createSubscriptionErr
	}
	f.profileCacheWrites++
	return f.createSubscription, nil
}

func (f *fakeBillingRepository) GetSubscriptionForCancel(ctx context.Context, userID, subscriptionID string) (*models.Subscription, error) {
	f.getForCancelCalls++
	f.getForCancelArgs = getForCancelArgs{userID: userID, subscriptionID: subscriptionID}
	if f.getForCancelErr != nil {
		return nil, f.getForCancelErr
	}
	return f.getForCancel, nil
}

func (f *fakeBillingRepository) CancelSubscription(ctx context.Context, userID, subscriptionID, status string) (*models.Subscription, error) {
	f.cancelSubscriptionCalls++
	f.cancelLastStatus = status
	f.cancelLastSubID = subscriptionID
	if f.cancelSubscriptionErr != nil {
		return nil, f.cancelSubscriptionErr
	}
	f.profileCacheWrites++
	return f.cancelSubscription, nil
}

func (f *fakeBillingRepository) HasActiveSubscription(ctx context.Context, userID string) (bool, error) {
	f.hasActiveCalls++
	if f.hasActiveErr != nil {
		return false, f.hasActiveErr
	}
	return f.hasActive, nil
}

// fakeBillingProvider records calls and returns canned responses for unit tests.
type fakeBillingProvider struct {
	createCalls           int
	createProviderSubID   string
	createErr             error
	cancelCalls           int
	cancelErr             error
}

func (p *fakeBillingProvider) CreateSubscription(_ context.Context, userID, planID string) (string, error) {
	p.createCalls++
	if p.createErr != nil {
		return "", p.createErr
	}
	if p.createProviderSubID != "" {
		return p.createProviderSubID, nil
	}
	return "manual:" + planID + ":" + userID, nil
}

func (p *fakeBillingProvider) CancelSubscription(_ context.Context, _ string) error {
	p.cancelCalls++
	return p.cancelErr
}

// --- CreateSubscription -----------------------------------------------------

func TestBillingService_CreateSubscription_Unit_RequiresPlanID(t *testing.T) {
	svc := NewBillingService(newFakeBillingRepo(nil), &fakeBillingProvider{})
	_, err := svc.CreateSubscription(context.Background(), "u1", models.CreateSubscriptionRequest{})
	require.Error(t, err)
}

func TestBillingService_CreateSubscription_Unit_RequiresBillingProvider(t *testing.T) {
	svc := NewBillingService(newFakeBillingRepo(nil), &fakeBillingProvider{})
	_, err := svc.CreateSubscription(context.Background(), "u1", models.CreateSubscriptionRequest{PlanID: models.PlanIDClosedBeta})
	require.Error(t, err)
}

func TestBillingService_CreateSubscription_Unit_RejectsNonManualProvider(t *testing.T) {
	svc := NewBillingService(newFakeBillingRepo(nil), &fakeBillingProvider{})
	_, err := svc.CreateSubscription(context.Background(), "u1", models.CreateSubscriptionRequest{
		PlanID:          models.PlanIDClosedBeta,
		BillingProvider: "wompi",
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "not supported in Milestone 1")
}

func TestBillingService_CreateSubscription_Unit_RejectsUnknownPlan(t *testing.T) {
	repo := newFakeBillingRepo(map[string]*models.Plan{})
	svc := NewBillingService(repo, &fakeBillingProvider{})
	_, err := svc.CreateSubscription(context.Background(), "u1", models.CreateSubscriptionRequest{
		PlanID:          "ghost",
		BillingProvider: models.BillingProviderManual,
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "does not exist")
	assert.Equal(t, 0, svc.provider.(*fakeBillingProvider).createCalls)
	assert.Equal(t, 0, repo.createSubscriptionCalls)
}

func TestBillingService_CreateSubscription_Unit_RejectsPaidPlan(t *testing.T) {
	monthly := "4.99"
	repo := newFakeBillingRepo(map[string]*models.Plan{
		models.PlanIDProMonthly: {ID: models.PlanIDProMonthly, PriceMonthlyUSD: &monthly},
	})
	svc := NewBillingService(repo, &fakeBillingProvider{})
	_, err := svc.CreateSubscription(context.Background(), "u1", models.CreateSubscriptionRequest{
		PlanID:          models.PlanIDProMonthly,
		BillingProvider: models.BillingProviderManual,
	})
	require.Error(t, err)
	assert.Contains(t, err.Error(), "paid plans")
	assert.Equal(t, 0, svc.provider.(*fakeBillingProvider).createCalls)
	assert.Equal(t, 0, repo.createSubscriptionCalls)
}

func TestBillingService_CreateSubscription_Unit_HappyPathFreePlan(t *testing.T) {
	zero := "0"
	freePlan := &models.Plan{ID: models.PlanIDFree, PriceMonthlyUSD: &zero, PriceAnnualUSD: &zero}
	repo := newFakeBillingRepo(map[string]*models.Plan{models.PlanIDFree: freePlan})
	repo.createSubscription = &models.Subscription{ID: "sub-1", UserID: "u1", PlanID: models.PlanIDFree, Status: models.SubscriptionStatusActive}
	prov := &fakeBillingProvider{}
	svc := NewBillingService(repo, prov)

	sub, err := svc.CreateSubscription(context.Background(), "u1", models.CreateSubscriptionRequest{
		PlanID:          models.PlanIDFree,
		BillingProvider: models.BillingProviderManual,
	})
	require.NoError(t, err)
	require.NotNil(t, sub)
	assert.Equal(t, models.PlanIDFree, sub.PlanID)
	assert.Equal(t, 1, prov.createCalls)
	assert.Equal(t, 1, repo.createSubscriptionCalls)
	assert.Equal(t, models.PlanIDFree, repo.createSubscriptionLast.planID)
	assert.Equal(t, models.BillingProviderManual, repo.createSubscriptionLast.billingProvider)
}

// --- CancelSubscription ------------------------------------------------------

func TestBillingService_CancelSubscription_Unit_NotFoundWhenRepoReturnsNil(t *testing.T) {
	repo := newFakeBillingRepo(nil)
	repo.getForCancel = nil
	svc := NewBillingService(repo, &fakeBillingProvider{})

	_, err := svc.CancelSubscription(context.Background(), "u1", "sub-x")
	require.Error(t, err)
	assert.ErrorIs(t, err, ErrSubscriptionNotFound)
	assert.Equal(t, 1, repo.getForCancelCalls)
}

func TestBillingService_CancelSubscription_Unit_ManualKeepsActiveUntilPeriodEnd(t *testing.T) {
	repo := newFakeBillingRepo(nil)
	emptyProviderSubID := ""
	repo.getForCancel = &models.Subscription{
		ID:                  "sub-1",
		UserID:              "u1",
		BillingProvider:     models.BillingProviderManual,
		ProviderSubscriptionID: &emptyProviderSubID,
	}
	repo.cancelSubscription = &models.Subscription{ID: "sub-1", UserID: "u1", Status: models.SubscriptionStatusActive}
	prov := &fakeBillingProvider{}
	svc := NewBillingService(repo, prov)

	sub, err := svc.CancelSubscription(context.Background(), "u1", "sub-1")
	require.NoError(t, err)
	require.NotNil(t, sub)
	assert.Equal(t, models.SubscriptionStatusActive, sub.Status)
	assert.Equal(t, 0, prov.cancelCalls)
	assert.Equal(t, 1, repo.cancelSubscriptionCalls)
	assert.Equal(t, models.SubscriptionStatusActive, repo.cancelLastStatus)
	assert.Equal(t, "sub-1", repo.cancelLastSubID)
}

func TestBillingService_CancelSubscription_Unit_ExternalProviderSetsCanceledAndCancelsAtProvider(t *testing.T) {
	repo := newFakeBillingRepo(nil)
	providerSubID := "wompi-123"
	repo.getForCancel = &models.Subscription{
		ID:                    "sub-1",
		UserID:                "u1",
		BillingProvider:       "wompi",
		ProviderSubscriptionID: &providerSubID,
	}
	repo.cancelSubscription = &models.Subscription{ID: "sub-1", UserID: "u1", Status: models.SubscriptionStatusCanceled}
	prov := &fakeBillingProvider{}
	svc := NewBillingService(repo, prov)

	sub, err := svc.CancelSubscription(context.Background(), "u1", "sub-1")
	require.NoError(t, err)
	require.NotNil(t, sub)
	assert.Equal(t, models.SubscriptionStatusCanceled, sub.Status)
	assert.Equal(t, 1, prov.cancelCalls)
	assert.Equal(t, models.SubscriptionStatusCanceled, repo.cancelLastStatus)
}

func TestBillingService_CancelSubscription_Unit_PropagatesProviderError(t *testing.T) {
	repo := newFakeBillingRepo(nil)
	providerSubID := "wompi-123"
	repo.getForCancel = &models.Subscription{
		ID:                    "sub-1",
		UserID:                "u1",
		BillingProvider:       "wompi",
		ProviderSubscriptionID: &providerSubID,
	}
	prov := &fakeBillingProvider{cancelErr: errors.New("gateway down")}
	svc := NewBillingService(repo, prov)

	_, err := svc.CancelSubscription(context.Background(), "u1", "sub-1")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "canceling provider subscription")
	assert.Equal(t, 1, prov.cancelCalls)
	assert.Equal(t, 0, repo.cancelSubscriptionCalls)
}

// --- HasActiveSubscription ---------------------------------------------------

func TestBillingService_HasActiveSubscription_Unit_DelegatesToRepo(t *testing.T) {
	repo := newFakeBillingRepo(nil)
	repo.hasActive = true
	svc := NewBillingService(repo, &fakeBillingProvider{})

	active, err := svc.HasActiveSubscription(context.Background(), "u1")
	require.NoError(t, err)
	assert.True(t, active)
	assert.Equal(t, 1, repo.hasActiveCalls)
}

func TestBillingService_HasActiveSubscription_Unit_PropagatesRepoError(t *testing.T) {
	repo := newFakeBillingRepo(nil)
	repo.hasActiveErr = errors.New("db unavailable")
	svc := NewBillingService(repo, &fakeBillingProvider{})

	_, err := svc.HasActiveSubscription(context.Background(), "u1")
	require.Error(t, err)
	assert.ErrorIs(t, err, repo.hasActiveErr)
}

// --- GetOrCreateClosedBetaSubscription ---------------------------------------

func TestBillingService_GetOrCreateClosedBetaSubscription_Unit_CreatesWhenNoneExists(t *testing.T) {
	repo := newFakeBillingRepo(nil)
	repo.getSubscription = nil
	repo.createClosedBeta = &models.Subscription{ID: "sub-1", UserID: "u1", PlanID: models.PlanIDClosedBeta, Status: models.SubscriptionStatusActive}
	svc := NewBillingService(repo, &fakeBillingProvider{})

	sub, err := svc.GetOrCreateClosedBetaSubscription(context.Background(), "u1")
	require.NoError(t, err)
	require.NotNil(t, sub)
	assert.Equal(t, models.PlanIDClosedBeta, sub.PlanID)
	assert.Equal(t, 1, repo.createClosedBetaCalls)
	assert.Equal(t, 0, repo.reactivateClosedBetaCalls)
}

func TestBillingService_GetOrCreateClosedBetaSubscription_Unit_ReactivesCanceledClosedBeta(t *testing.T) {
	repo := newFakeBillingRepo(nil)
	repo.getSubscription = &models.Subscription{ID: "sub-1", UserID: "u1", PlanID: models.PlanIDClosedBeta, Status: models.SubscriptionStatusCanceled}
	repo.reactivateClosedBeta = &models.Subscription{ID: "sub-1", UserID: "u1", PlanID: models.PlanIDClosedBeta, Status: models.SubscriptionStatusActive}
	svc := NewBillingService(repo, &fakeBillingProvider{})

	sub, err := svc.GetOrCreateClosedBetaSubscription(context.Background(), "u1")
	require.NoError(t, err)
	require.NotNil(t, sub)
	assert.Equal(t, models.SubscriptionStatusActive, sub.Status)
	assert.Equal(t, 0, repo.createClosedBetaCalls)
	assert.Equal(t, 1, repo.reactivateClosedBetaCalls)
}

func TestBillingService_GetOrCreateClosedBetaSubscription_Unit_ReturnsExistingActive(t *testing.T) {
	repo := newFakeBillingRepo(nil)
	existing := &models.Subscription{ID: "sub-1", UserID: "u1", PlanID: models.PlanIDClosedBeta, Status: models.SubscriptionStatusActive}
	repo.getSubscription = existing
	svc := NewBillingService(repo, &fakeBillingProvider{})

	sub, err := svc.GetOrCreateClosedBetaSubscription(context.Background(), "u1")
	require.NoError(t, err)
	assert.Same(t, existing, sub)
	assert.Equal(t, 0, repo.createClosedBetaCalls)
	assert.Equal(t, 0, repo.reactivateClosedBetaCalls)
}

func TestBillingService_GetOrCreateClosedBetaSubscription_Unit_DoesNotReactivatePaidPlan(t *testing.T) {
	repo := newFakeBillingRepo(nil)
	paid := &models.Subscription{ID: "sub-1", UserID: "u1", PlanID: models.PlanIDProMonthly, Status: models.SubscriptionStatusCanceled}
	repo.getSubscription = paid
	svc := NewBillingService(repo, &fakeBillingProvider{})

	sub, err := svc.GetOrCreateClosedBetaSubscription(context.Background(), "u1")
	require.NoError(t, err)
	assert.Same(t, paid, sub)
	assert.Equal(t, 0, repo.createClosedBetaCalls)
	assert.Equal(t, 0, repo.reactivateClosedBetaCalls)
}

func newFakeBillingRepo(plans map[string]*models.Plan) *fakeBillingRepository {
	if plans == nil {
		plans = map[string]*models.Plan{}
	}
	return &fakeBillingRepository{getPlanByID: plans}
}