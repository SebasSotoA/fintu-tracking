package main

import (
	"fintu-tracking-backend/internal/database"
	"fintu-tracking-backend/internal/handlers"
	"fintu-tracking-backend/internal/middleware"
	"fintu-tracking-backend/internal/migrations"
	"fintu-tracking-backend/internal/services"
	"fmt"
	"log"
	"os"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Connect to database
	if err := database.Connect(); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	// Run migrations before the app accepts traffic.
	if err := runMigrations(); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Wire DB pool into service singletons
	billingProvider := services.NewNoOpBillingProvider()
	billingSvc := services.NewBillingService(database.GetPool(), billingProvider)
	handlers.InitBillingService(billingSvc)
	handlers.InitExchangeRateService()
	handlers.InitTwelveDataService()
	handlers.InitBrokerService(database.GetPool())
	handlers.InitProfileService(database.GetPool())

	// Create Fiber app
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

	// Middleware
	app.Use(logger.New())
	allowedOrigins := []string{"http://localhost:3000", "http://localhost:3001"}
	if feURL := os.Getenv("FRONTEND_URL"); feURL != "" {
		allowedOrigins = append(allowedOrigins, feURL)
	}
	app.Use(cors.New(cors.Config{
		AllowOrigins: allowedOrigins,
		AllowHeaders: []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
	}))

	// Health check
	app.Get("/health", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"service": "fintu-tracking-api",
		})
	})

	// API routes
	api := app.Group("/api")

	// Authenticated routes that do not require an active subscription.
	authOnly := api.Group("", middleware.AuthMiddleware())

	// Current user / onboarding endpoints
	authOnly.Get("/me", handlers.GetMe)
	authOnly.Patch("/me/onboarding", handlers.UpdateOnboarding)

	// Billing endpoints
	authOnly.Get("/plans", handlers.ListPlans)
	authOnly.Get("/subscriptions/current", handlers.GetSubscription)
	authOnly.Post("/subscriptions", handlers.CreateSubscription)
	authOnly.Patch("/subscriptions/:id/cancel", handlers.CancelSubscription)

	// Broker endpoints are auth-only (not subscription-gated) so onboarding can
	// create the user's first broker before a plan is selected.
	authOnly.Get("/brokers", handlers.ListBrokers)
	authOnly.Post("/brokers", handlers.CreateBroker)

	// Protected routes - require authentication and an active subscription.
	protected := authOnly.Group("", middleware.RequireActivePlan(billingSvc))

	// FX Rates endpoints
	protected.Get("/fx-rates/current", handlers.GetCurrentRate)
	protected.Get("/fx-rates/chart", handlers.GetFxRateChart)
	protected.Get("/fx-rates", handlers.ListFxRates)
	protected.Post("/fx-rates", handlers.CreateFxRate)
	protected.Put("/fx-rates/:id", handlers.UpdateFxRate)
	protected.Delete("/fx-rates/:id", handlers.DeleteFxRate)

	// Cash Flows endpoints
	protected.Get("/cash-flows", handlers.ListCashFlows)
	protected.Post("/cash-flows", handlers.CreateCashFlow)
	protected.Put("/cash-flows/:id", handlers.UpdateCashFlow)
	protected.Delete("/cash-flows/:id", handlers.DeleteCashFlow)

	// Trades endpoints
	protected.Get("/trade-tickers", handlers.ListTradeTickers)
	protected.Get("/trades", handlers.ListTrades)
	protected.Post("/trades", handlers.CreateTrade)
	protected.Put("/trades/:id", handlers.UpdateTrade)
	protected.Delete("/trades/:id", handlers.DeleteTrade)

	// Market Prices endpoints
	protected.Get("/market-prices", handlers.ListMarketPrices)
	protected.Get("/market-prices/:ticker", handlers.GetMarketPrice)
	protected.Post("/market-prices/refresh", handlers.RefreshMarketPrices)

	// Portfolio endpoints
	protected.Get("/portfolio/holdings", handlers.GetHoldings)

	// Analytics endpoints
	protected.Get("/analytics/fee-breakdown", handlers.GetFeeBreakdown)
	protected.Get("/analytics/fee-impact", handlers.GetFeeImpact)
	protected.Get("/analytics/fee-efficiency", handlers.GetFeeEfficiency)
	protected.Get("/analytics/return-attribution", handlers.GetReturnAttribution)
	protected.Get("/analytics/fx-impact", handlers.GetFXImpact)
	protected.Get("/analytics/performance-time-series", handlers.GetPerformanceTimeSeries)
	protected.Get("/analytics/net-worth", handlers.GetNetWorth)
	protected.Get("/analytics/cash-reconciliation", handlers.GetCashReconciliation)

	// Activity feed
	protected.Get("/activity/feed", handlers.GetActivityFeed)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("Server starting on port %s\n", port)
	log.Fatal(app.Listen(":" + port))
}

// runMigrations opens a dedicated migration database connection, applies all
// pending migrations, and closes the connection. Errors are fatal to startup
// so the app never serves traffic against an out-of-date schema.
func runMigrations() error {
	migrationDB, err := database.OpenMigrationDB()
	if err != nil {
		return err
	}
	defer migrationDB.Close()

	return migrations.Up(migrationDB, "migrations")
}
