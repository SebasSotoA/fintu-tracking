package server

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"

	"fintu-tracking-backend/internal/database"
	"fintu-tracking-backend/internal/handlers"
	"fintu-tracking-backend/internal/middleware"
	"fintu-tracking-backend/internal/services"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/logger"
)

// Deps holds wired services required to build the Fiber application.
type Deps struct {
	BillingSvc *services.BillingService
}

// Bootstrap connects to the database and initializes handler service singletons.
func Bootstrap(ctx context.Context) (*Deps, error) {
	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("bootstrap: %w", err)
	}

	if err := database.Connect(); err != nil {
		return nil, fmt.Errorf("database connect: %w", err)
	}

	billingProvider := services.NewNoOpBillingProvider()
	billingSvc := services.NewBillingService(database.GetPool(), billingProvider)
	handlers.InitBillingService(billingSvc)
	handlers.InitExchangeRateService()
	handlers.InitTwelveDataService()
	handlers.InitBrokerService(database.GetPool())
	handlers.InitProfileService(database.GetPool())

	return &Deps{BillingSvc: billingSvc}, nil
}

// Close releases database resources held by Bootstrap.
func (d *Deps) Close() {
	database.Close()
}

// NewApp builds a Fiber application with middleware and all API routes.
//
// Lambda runtime env (wired in Phase 4.2): DATABASE_URL, SUPABASE_URL,
// SUPABASE_JWT_SECRET, FRONTEND_URL, TWELVE_DATA_API_KEY, DB_MAX_OPEN_CONNS,
// DB_MAX_IDLE_CONNS.
func NewApp(deps *Deps) *fiber.App {
	warnLambdaMissingFrontendURL()

	app := fiber.New(fiber.Config{
		ErrorHandler: func(c fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: corsAllowOrigins(),
		AllowHeaders: []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
	}))

	app.Get("/health", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"service": "fintu-tracking-api",
		})
	})

	api := app.Group("/api")

	authOnly := api.Group("", middleware.AuthMiddleware())

	authOnly.Get("/me", handlers.GetMe)
	authOnly.Patch("/me/onboarding", handlers.UpdateOnboarding)
	authOnly.Patch("/me/profile", handlers.UpdateProfile)

	authOnly.Get("/plans", handlers.ListPlans)
	authOnly.Get("/subscriptions/current", handlers.GetSubscription)
	authOnly.Post("/subscriptions", handlers.CreateSubscription)
	authOnly.Patch("/subscriptions/:id/cancel", handlers.CancelSubscription)

	authOnly.Get("/brokers", handlers.ListBrokers)
	authOnly.Post("/brokers", handlers.CreateBroker)

	protected := authOnly.Group("", middleware.RequireActivePlan(deps.BillingSvc))

	protected.Get("/fx-rates/current", handlers.GetCurrentRate)
	protected.Get("/fx-rates/chart", handlers.GetFxRateChart)
	protected.Get("/fx-rates", handlers.ListFxRates)
	protected.Post("/fx-rates", handlers.CreateFxRate)
	protected.Put("/fx-rates/:id", handlers.UpdateFxRate)
	protected.Delete("/fx-rates/:id", handlers.DeleteFxRate)

	protected.Get("/cash-flows", handlers.ListCashFlows)
	protected.Post("/cash-flows", handlers.CreateCashFlow)
	protected.Put("/cash-flows/:id", handlers.UpdateCashFlow)
	protected.Delete("/cash-flows/:id", handlers.DeleteCashFlow)

	protected.Get("/trade-tickers", handlers.ListTradeTickers)
	protected.Get("/trades", handlers.ListTrades)
	protected.Post("/trades", handlers.CreateTrade)
	protected.Put("/trades/:id", handlers.UpdateTrade)
	protected.Delete("/trades/:id", handlers.DeleteTrade)

	protected.Get("/market-prices", handlers.ListMarketPrices)
	protected.Get("/market-prices/:ticker", handlers.GetMarketPrice)
	protected.Post("/market-prices/refresh", handlers.RefreshMarketPrices)

	protected.Get("/portfolio/holdings", handlers.GetHoldings)

	protected.Get("/analytics/fee-breakdown", handlers.GetFeeBreakdown)
	protected.Get("/analytics/fee-impact", handlers.GetFeeImpact)
	protected.Get("/analytics/fee-efficiency", handlers.GetFeeEfficiency)
	protected.Get("/analytics/return-attribution", handlers.GetReturnAttribution)
	protected.Get("/analytics/fx-impact", handlers.GetFXImpact)
	protected.Get("/analytics/performance-time-series", handlers.GetPerformanceTimeSeries)
	protected.Get("/analytics/net-worth", handlers.GetNetWorth)
	protected.Get("/analytics/cash-reconciliation", handlers.GetCashReconciliation)

	protected.Get("/activity/feed", handlers.GetActivityFeed)

	return app
}

func corsAllowOrigins() []string {
	origins := []string{"http://localhost:3000", "http://localhost:3001"}
	if feURL := strings.TrimSpace(os.Getenv("FRONTEND_URL")); feURL != "" {
		origins = append(origins, feURL)
	}
	return origins
}

func warnLambdaMissingFrontendURL() {
	if os.Getenv("AWS_LAMBDA_RUNTIME_API") == "" {
		return
	}
	if strings.TrimSpace(os.Getenv("FRONTEND_URL")) != "" {
		return
	}
	log.Printf("warning: FRONTEND_URL is not set in Lambda; browser CORS will only allow localhost origins")
}
