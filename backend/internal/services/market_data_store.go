package services

import (
	"context"
	"time"

	"fintu-tracking-backend/internal/models"
)

// MarketDataStore abstracts reads and writes for FX rates and market prices.
// It is the persistence layer behind the shared Postgres TTL cache.
// The Postgres implementation lives in internal/repositories.
type MarketDataStore interface {
	GetFxRate(ctx context.Context, userID, date, source string) (models.RateResult, bool, error)
	UpsertFxRate(ctx context.Context, userID string, date time.Time, rate, source string) error
	GetLatestFxRate(ctx context.Context, userID string) (models.RateResult, bool, error)

	ListHeldTickers(ctx context.Context, userID string) ([]string, error)
	ListAllHeldTickers(ctx context.Context) ([]string, error)
	GetMarketPrice(ctx context.Context, ticker string) (models.MarketPrice, bool, error)
	GetMarketPrices(ctx context.Context, tickers []string) ([]models.MarketPrice, error)
	UpsertMarketPrice(ctx context.Context, ticker, price, currency string) error

	RecordMarketPriceRefresh(ctx context.Context, userID string) error
	GetLastMarketPriceRefresh(ctx context.Context, userID string) (time.Time, bool, error)
}