package services

// AnalyticsService handles performance attribution and analysis. It holds an
// AnalyticsRepository (not a database pool) so it can be unit-tested with a
// fake and so all SQL lives in the repositories package.
type AnalyticsService struct {
	repo AnalyticsRepository
}

// NewAnalyticsService creates a new analytics service backed by the given
// repository. Wire it with repositories.NewPostgresAnalyticsRepository(pool)
// in handlers; pass a fake in unit tests.
func NewAnalyticsService(repo AnalyticsRepository) *AnalyticsService {
	return &AnalyticsService{repo: repo}
}