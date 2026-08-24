package repositories

import (
	"context"
	"fmt"

	"fintu-tracking-backend/internal/config"
	"fintu-tracking-backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PostgresBrokerRepository implements services.BrokerRepository against Postgres.
type PostgresBrokerRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresBrokerRepository returns a BrokerRepository backed by the given pool.
func NewPostgresBrokerRepository(pool *pgxpool.Pool) *PostgresBrokerRepository {
	return &PostgresBrokerRepository{pool: pool}
}

// ListBrokers returns every broker row owned by the user.
func (r *PostgresBrokerRepository) ListBrokers(ctx context.Context, userID string) ([]models.Broker, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, user_id, preset_id, name, country, base_currency, local_currency,
		       deposit_fee_type, deposit_fee_value, withdrawal_fee_type, withdrawal_fee_value,
		       created_at, updated_at
		FROM brokers
		WHERE user_id = $1
		ORDER BY created_at ASC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("querying brokers: %w", err)
	}
	defer rows.Close()

	return pgx.CollectRows(rows, pgx.RowToStructByName[models.Broker])
}

// GetBrokerByID returns a broker row if it exists and belongs to the user.
func (r *PostgresBrokerRepository) GetBrokerByID(ctx context.Context, userID, brokerID string) (*models.Broker, error) {
	row, err := r.pool.Query(ctx, `
		SELECT id, user_id, preset_id, name, country, base_currency, local_currency,
		       deposit_fee_type, deposit_fee_value, withdrawal_fee_type, withdrawal_fee_value,
		       created_at, updated_at
		FROM brokers
		WHERE id = $1 AND user_id = $2
	`, brokerID, userID)
	if err != nil {
		return nil, fmt.Errorf("querying broker: %w", err)
	}
	defer row.Close()

	broker, err := pgx.CollectOneRow(row, pgx.RowToStructByName[models.Broker])
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("collecting broker: %w", err)
	}
	return &broker, nil
}

// GetOrCreateBrokerFromPreset returns an existing user broker for the preset or
// creates one from the built-in preset configuration. It is idempotent.
func (r *PostgresBrokerRepository) GetOrCreateBrokerFromPreset(ctx context.Context, userID, presetID string) (*models.Broker, error) {
	preset := config.GetBrokerPreset(presetID)
	if preset == nil {
		return nil, fmt.Errorf("unknown broker preset %q", presetID)
	}

	rows, err := r.pool.Query(ctx, `
		INSERT INTO brokers (
			user_id, preset_id, name, country, base_currency, local_currency,
			deposit_fee_type, deposit_fee_value, withdrawal_fee_type, withdrawal_fee_value
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		ON CONFLICT (user_id, preset_id) DO UPDATE SET
			name = EXCLUDED.name,
			country = EXCLUDED.country,
			base_currency = EXCLUDED.base_currency,
			local_currency = EXCLUDED.local_currency,
			deposit_fee_type = EXCLUDED.deposit_fee_type,
			deposit_fee_value = EXCLUDED.deposit_fee_value,
			withdrawal_fee_type = EXCLUDED.withdrawal_fee_type,
			withdrawal_fee_value = EXCLUDED.withdrawal_fee_value,
			updated_at = NOW()
		RETURNING id, user_id, preset_id, name, country, base_currency, local_currency,
		          deposit_fee_type, deposit_fee_value, withdrawal_fee_type, withdrawal_fee_value,
		          created_at, updated_at
	`, userID, preset.ID, preset.Name, preset.Country, preset.BaseCurrency, preset.LocalCurrency,
		preset.DepositFee.Type, preset.DepositFee.Value, preset.WithdrawalFee.Type, preset.WithdrawalFee.Value)
	if err != nil {
		return nil, fmt.Errorf("upserting broker: %w", err)
	}
	defer rows.Close()

	broker, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[models.Broker])
	if err != nil {
		return nil, fmt.Errorf("collecting broker: %w", err)
	}
	return &broker, nil
}