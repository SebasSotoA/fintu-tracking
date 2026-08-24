package services

// SQL string helpers for analytics previously lived here. They have moved to
// repositories/postgres_analytics.go alongside the PostgresAnalyticsRepository
// that owns every SQL query the analytics service needs. This file is kept as
// an anchor for git history; the service layer now holds no SQL.