package handlers

import (
	"fintu-tracking-backend/internal/services"
)

var feeService *services.FeeService
var analyticsService *services.AnalyticsService

// InitFeeService sets the package-level fee service used by handlers.
// It is called once from Bootstrap after the DB pool is available.
func InitFeeService(svc *services.FeeService) {
	feeService = svc
}

// InitAnalyticsService sets the package-level analytics service used by handlers.
// It is called once from Bootstrap after the DB pool is available.
func InitAnalyticsService(svc *services.AnalyticsService) {
	analyticsService = svc
}