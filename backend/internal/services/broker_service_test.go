package services

import (
	"context"
	"os"
	"testing"

	"fintu-tracking-backend/internal/config"
	"fintu-tracking-backend/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestComputeDepositFeeUSD(t *testing.T) {
	s := NewBrokerService(nil)

	tests := []struct {
		name      string
		net       string
		broker    models.Broker
		want      string
		wantError bool
	}{
		{
			name: "percentage deposit fee",
			net:  "1000",
			broker: models.Broker{
				DepositFeeType:  string(config.BrokerFeeTypePercentage),
				DepositFeeValue: "0.009",
			},
			want: "9.00",
		},
		{
			name: "flat withdrawal fee",
			net:  "1000",
			broker: models.Broker{
				WithdrawalFeeType:  string(config.BrokerFeeTypeFlat),
				WithdrawalFeeValue: "5",
			},
			want: "5.00",
		},
		{
			name: "none fee returns zero",
			net:  "1000",
			broker: models.Broker{
				DepositFeeType:  string(config.BrokerFeeTypeNone),
				DepositFeeValue: "0",
			},
			want: "0.00",
		},
		{
			name: "invalid net amount returns nil",
			net:  "",
			broker: models.Broker{
				DepositFeeType:  string(config.BrokerFeeTypePercentage),
				DepositFeeValue: "0.009",
			},
			want: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var got *string
			var err error
			if tt.name == "flat withdrawal fee" {
				got, err = s.ComputeWithdrawalFeeUSD(tt.net, tt.broker)
			} else {
				got, err = s.ComputeDepositFeeUSD(tt.net, tt.broker)
			}

			if tt.wantError {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			if tt.want == "" {
				assert.Nil(t, got)
				return
			}
			require.NotNil(t, got)
			assert.Equal(t, tt.want, *got)
		})
	}
}

func TestGetBrokerPreset(t *testing.T) {
	assert.NotNil(t, config.GetBrokerPreset("hapi-colombia"))
	assert.Nil(t, config.GetBrokerPreset("unknown"))
}

func TestBrokerService_ListBrokers(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dsn)
	require.NoError(t, err)
	defer pool.Close()

	s := NewBrokerService(pool)
	userID := uuid.New().String()

	_, err = s.GetOrCreateBrokerFromPreset(ctx, userID, "hapi-colombia")
	require.NoError(t, err)

	brokers, err := s.ListBrokers(ctx, userID)
	require.NoError(t, err)
	require.Len(t, brokers, 1)
	assert.Equal(t, "hapi-colombia", brokers[0].PresetID)
	assert.Equal(t, "Hapi", brokers[0].Name)
}

func TestBrokerService_GetOrCreateBrokerFromPreset_idempotent(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dsn)
	require.NoError(t, err)
	defer pool.Close()

	s := NewBrokerService(pool)
	userID := uuid.New().String()

	first, err := s.GetOrCreateBrokerFromPreset(ctx, userID, "hapi-colombia")
	require.NoError(t, err)

	second, err := s.GetOrCreateBrokerFromPreset(ctx, userID, "hapi-colombia")
	require.NoError(t, err)

	assert.Equal(t, first.ID, second.ID)
}
