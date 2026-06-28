package services

import (
	"fmt"
	"time"

	"fintu-tracking-backend/internal/config"
)

// cacheFreshness determines whether a cached value is still valid.
func isFresh(cachedAt time.Time, ttl time.Duration) bool {
	return time.Since(cachedAt) <= ttl
}

// defaultCacheTTL returns the configured market-data cache TTL.
func defaultCacheTTL() time.Duration {
	return config.MarketDataCacheTTL
}

// defaultMarketPriceCooldown returns the cooldown between user-initiated price refreshes.
func defaultMarketPriceCooldown() time.Duration {
	return config.MarketPriceCooldown
}

// RateLimitError indicates a user-initiated refresh was rejected because it happened
// too soon after the previous refresh. RetryAfter tells the caller how long to wait.
type RateLimitError struct {
	RetryAfter time.Duration
}

func (e *RateLimitError) Error() string {
	return fmt.Sprintf("market price refresh cooldown: retry after %v", e.RetryAfter)
}
