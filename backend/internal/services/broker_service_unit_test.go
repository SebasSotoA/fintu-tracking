package services

import (
	"context"
	"testing"

	"fintu-tracking-backend/internal/config"
	"fintu-tracking-backend/internal/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type fakeBrokerRepository struct {
	brokers     map[string][]models.Broker
	byID        map[string]*models.Broker
	created     map[string]*models.Broker
	createCalls []string
}

func newFakeBrokerRepository() *fakeBrokerRepository {
	return &fakeBrokerRepository{
		brokers: make(map[string][]models.Broker),
		byID:    make(map[string]*models.Broker),
		created: make(map[string]*models.Broker),
	}
}

func (f *fakeBrokerRepository) ListBrokers(ctx context.Context, userID string) ([]models.Broker, error) {
	return f.brokers[userID], nil
}

func (f *fakeBrokerRepository) GetBrokerByID(ctx context.Context, userID, brokerID string) (*models.Broker, error) {
	return f.byID[userID+":"+brokerID], nil
}

func (f *fakeBrokerRepository) GetOrCreateBrokerFromPreset(ctx context.Context, userID, presetID string) (*models.Broker, error) {
	f.createCalls = append(f.createCalls, presetID)
	if b, ok := f.created[userID+":"+presetID]; ok {
		return b, nil
	}
	b := &models.Broker{
		ID:       "broker-" + presetID,
		UserID:   userID,
		PresetID: presetID,
		Name:     presetID,
	}
	f.created[userID+":"+presetID] = b
	return b, nil
}

func TestBrokerService_ListBrokers_Unit(t *testing.T) {
	fake := newFakeBrokerRepository()
	userID := "user-1"
	fake.brokers[userID] = []models.Broker{
		{ID: "b1", UserID: userID, PresetID: "hapi-colombia", Name: "Hapi"},
		{ID: "b2", UserID: userID, PresetID: "hapi-usa", Name: "Hapi USA"},
	}

	svc := NewBrokerService(fake)
	brokers, err := svc.ListBrokers(context.Background(), userID)
	require.NoError(t, err)
	assert.Len(t, brokers, 2)
	assert.Equal(t, "b1", brokers[0].ID)
	assert.Equal(t, "b2", brokers[1].ID)
}

func TestBrokerService_GetOrCreateBrokerFromPreset_Unit(t *testing.T) {
	fake := newFakeBrokerRepository()
	svc := NewBrokerService(fake)

	broker, err := svc.GetOrCreateBrokerFromPreset(context.Background(), "user-1", "hapi-colombia")
	require.NoError(t, err)
	require.NotNil(t, broker)
	assert.Equal(t, "hapi-colombia", broker.PresetID)
	assert.Equal(t, []string{"hapi-colombia"}, fake.createCalls)

	broker2, err := svc.GetOrCreateBrokerFromPreset(context.Background(), "user-1", "hapi-colombia")
	require.NoError(t, err)
	assert.Same(t, broker, broker2)
	assert.Len(t, fake.createCalls, 2)
}

func TestBrokerService_ComputeDepositFeeUSD_Unit(t *testing.T) {
	svc := NewBrokerService(nil)

	got, err := svc.ComputeDepositFeeUSD("1000", models.Broker{
		DepositFeeType:  string(config.BrokerFeeTypePercentage),
		DepositFeeValue: "0.009",
	})
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.Equal(t, "9.00", *got)
}