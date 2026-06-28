package services

import (
	"context"
	"fmt"
	"time"

	"fintu-tracking-backend/internal/models"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// MarketDataStore abstracts reads and writes for FX rates and market prices.
// It is the persistence layer behind the shared Postgres TTL cache.
type MarketDataStore interface {
	GetFxRate(ctx context.Context, userID, date, source string) (RateResult, bool, error)
	UpsertFxRate(ctx context.Context, userID string, date time.Time, rate, source string) error
	GetLatestFxRate(ctx context.Context, userID string) (RateResult, bool, error)

	ListHeldTickers(ctx context.Context, userID string) ([]string, error)
	GetMarketPrice(ctx context.Context, ticker string) (models.MarketPrice, bool, error)
	GetMarketPrices(ctx context.Context, tickers []string) ([]models.MarketPrice, error)
	UpsertMarketPrice(ctx context.Context, ticker, price, currency string) error

	RecordMarketPriceRefresh(ctx context.Context, userID string) error
	GetLastMarketPriceRefresh(ctx context.Context, userID string) (time.Time, bool, error)
}

// postgresMarketDataStore implements MarketDataStore on top of pgxpool.Pool.
type postgresMarketDataStore struct {
	pool *pgxpool.Pool
}

// NewPostgresMarketDataStore creates a store backed by the given DB pool.
func NewPostgresMarketDataStore(pool *pgxpool.Pool) MarketDataStore {
	return &postgresMarketDataStore{pool: pool}
}

func (s *postgresMarketDataStore) GetFxRate(ctx context.Context, userID, date, source string) (RateResult, bool, error) {
	if s.pool == nil {
		return RateResult{}, false, nil
	}

	var rate, resultSource string
	var updatedAt time.Time
	query := `
		SELECT rate, source, updated_at
		FROM fx_rates
		WHERE user_id = $1 AND date = $2 AND source = $3
		LIMIT 1
	`
	err := s.pool.QueryRow(ctx, query, userID, date, source).Scan(&rate, &resultSource, &updatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return RateResult{}, false, nil
		}
		return RateResult{}, false, fmt.Errorf("get fx rate: %w", err)
	}

	return RateResult{Rate: rate, Date: date, Source: resultSource, CachedAt: updatedAt}, true, nil
}

func (s *postgresMarketDataStore) UpsertFxRate(ctx context.Context, userID string, date time.Time, rate, source string) error {
	if s.pool == nil {
		return fmt.Errorf("database pool is not initialized")
	}

	id := uuid.New().String()
	query := `
		INSERT INTO fx_rates (id, user_id, date, rate, source)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_id, date)
		DO UPDATE SET rate = $4, source = $5
	`
	_, err := s.pool.Exec(ctx, query, id, userID, date, rate, source)
	return err
}

func (s *postgresMarketDataStore) GetLatestFxRate(ctx context.Context, userID string) (RateResult, bool, error) {
	if s.pool == nil {
		return RateResult{}, false, nil
	}

	var rate, source string
	var date time.Time
	query := `
		SELECT rate, source, date
		FROM fx_rates
		WHERE user_id = $1
		ORDER BY date DESC, updated_at DESC
		LIMIT 1
	`
	err := s.pool.QueryRow(ctx, query, userID).Scan(&rate, &source, &date)
	if err != nil {
		if err == pgx.ErrNoRows {
			return RateResult{}, false, nil
		}
		return RateResult{}, false, fmt.Errorf("get latest fx rate: %w", err)
	}

	today := time.Now().UTC().Format("2006-01-02")
	return RateResult{Rate: rate, Date: today, Source: source}, true, nil
}

func (s *postgresMarketDataStore) ListHeldTickers(ctx context.Context, userID string) ([]string, error) {
	if s.pool == nil {
		return nil, fmt.Errorf("database pool is not initialized")
	}

	query := `
		SELECT ticker
		FROM trades
		WHERE user_id = $1
		GROUP BY ticker
		HAVING SUM(CASE WHEN side = 'buy' THEN quantity ELSE -quantity END) > 0
		ORDER BY ticker
	`

	rows, err := s.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("list held tickers: %w", err)
	}
	defer rows.Close()

	tickers := make([]string, 0)
	for rows.Next() {
		var ticker string
		if err := rows.Scan(&ticker); err != nil {
			return nil, fmt.Errorf("scan ticker: %w", err)
		}
		tickers = append(tickers, ticker)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate tickers: %w", err)
	}
	return tickers, nil
}

func (s *postgresMarketDataStore) GetMarketPrice(ctx context.Context, ticker string) (models.MarketPrice, bool, error) {
	if s.pool == nil {
		return models.MarketPrice{}, false, nil
	}

	var price models.MarketPrice
	query := `SELECT ticker, price, currency, updated_at FROM market_prices WHERE ticker = $1`
	err := s.pool.QueryRow(ctx, query, ticker).Scan(
		&price.Ticker, &price.Price, &price.Currency, &price.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return models.MarketPrice{}, false, nil
		}
		return models.MarketPrice{}, false, fmt.Errorf("get market price: %w", err)
	}
	return price, true, nil
}

func (s *postgresMarketDataStore) GetMarketPrices(ctx context.Context, tickers []string) ([]models.MarketPrice, error) {
	if s.pool == nil || len(tickers) == 0 {
		return []models.MarketPrice{}, nil
	}

	query := `SELECT ticker, price, currency, updated_at FROM market_prices WHERE ticker = ANY($1) ORDER BY ticker`
	rows, err := s.pool.Query(ctx, query, tickers)
	if err != nil {
		return nil, fmt.Errorf("get market prices: %w", err)
	}
	defer rows.Close()

	prices := make([]models.MarketPrice, 0, len(tickers))
	for rows.Next() {
		var price models.MarketPrice
		if err := rows.Scan(&price.Ticker, &price.Price, &price.Currency, &price.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan market price: %w", err)
		}
		prices = append(prices, price)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate market prices: %w", err)
	}
	return prices, nil
}

func (s *postgresMarketDataStore) UpsertMarketPrice(ctx context.Context, ticker, price, currency string) error {
	if s.pool == nil {
		return fmt.Errorf("database pool is not initialized")
	}

	query := `
		INSERT INTO market_prices (ticker, price, currency, updated_at)
		VALUES ($1, $2, $3, NOW())
		ON CONFLICT (ticker) DO UPDATE
		SET price = EXCLUDED.price, currency = EXCLUDED.currency, updated_at = NOW()
	`
	_, err := s.pool.Exec(ctx, query, ticker, price, currency)
	return err
}

func (s *postgresMarketDataStore) RecordMarketPriceRefresh(ctx context.Context, userID string) error {
	if s.pool == nil {
		return fmt.Errorf("database pool is not initialized")
	}

	query := `
		INSERT INTO market_price_refresh_log (user_id, refreshed_at)
		VALUES ($1, NOW())
		ON CONFLICT (user_id) DO UPDATE SET refreshed_at = NOW()
	`
	_, err := s.pool.Exec(ctx, query, userID)
	return err
}

func (s *postgresMarketDataStore) GetLastMarketPriceRefresh(ctx context.Context, userID string) (time.Time, bool, error) {
	if s.pool == nil {
		return time.Time{}, false, nil
	}

	var refreshedAt time.Time
	query := `SELECT refreshed_at FROM market_price_refresh_log WHERE user_id = $1`
	err := s.pool.QueryRow(ctx, query, userID).Scan(&refreshedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return time.Time{}, false, nil
		}
		return time.Time{}, false, fmt.Errorf("get last refresh: %w", err)
	}
	return refreshedAt, true, nil
}
