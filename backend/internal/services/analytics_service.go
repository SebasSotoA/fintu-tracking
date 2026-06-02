package services

import (
	"github.com/jackc/pgx/v5/pgxpool"
)

// AnalyticsService handles performance attribution and analysis
type AnalyticsService struct {
	pool *pgxpool.Pool
}

// NewAnalyticsService creates a new analytics service
func NewAnalyticsService(pool *pgxpool.Pool) *AnalyticsService {
	return &AnalyticsService{pool: pool}
}
