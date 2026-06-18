package main

import (
	"fintu-tracking-backend/internal/database"
	"fintu-tracking-backend/internal/handlers"
	"fintu-tracking-backend/internal/middleware"
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

	// Wire DB pool into service singletons
	handlers.InitExchangeRateService()
	handlers.InitTwelveDataService()

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
		AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
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

	// Protected routes - require authentication
	protected := api.Group("", middleware.AuthMiddleware())

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

	// Trades endpoints (/trade-tickers avoids GET /trades/tickers matching PUT /trades/:id on some setups)
	protected.Get("/trade-tickers", handlers.ListTradeTickers)
	protected.Get("/trades/tickers", handlers.ListTradeTickers)
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
	protected.Get("/portfolio/performance", handlers.GetPerformance)

	// Analytics endpoints
	protected.Get("/analytics/fee-breakdown", handlers.GetFeeBreakdown)
	protected.Get("/analytics/fee-impact", handlers.GetFeeImpact)
	protected.Get("/analytics/fee-efficiency", handlers.GetFeeEfficiency)
	protected.Get("/analytics/return-attribution", handlers.GetReturnAttribution)
	protected.Get("/analytics/fx-impact", handlers.GetFXImpact)
	protected.Get("/analytics/performance-time-series", handlers.GetPerformanceTimeSeries)
	protected.Get("/analytics/net-worth", handlers.GetNetWorth)
	protected.Get("/analytics/cash-reconciliation", handlers.GetCashReconciliation)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("Server starting on port %s\n", port)
	log.Fatal(app.Listen(":" + port))
}
