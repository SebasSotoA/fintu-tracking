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
	app.Use(cors.New(cors.Config{
		AllowOrigins: []string{
			"http://localhost:3000",
			"http://localhost:3001",
			os.Getenv("FRONTEND_URL"),
		},
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
	protected.Get("/trades", handlers.ListTrades)
	protected.Post("/trades", handlers.CreateTrade)
	protected.Put("/trades/:id", handlers.UpdateTrade)
	protected.Delete("/trades/:id", handlers.DeleteTrade)

	// Market Prices endpoints (read-only for authenticated users)
	protected.Get("/market-prices", handlers.ListMarketPrices)
	protected.Get("/market-prices/:ticker", handlers.GetMarketPrice)

	// Portfolio endpoints
	protected.Get("/portfolio/holdings", handlers.GetHoldings)
	protected.Get("/portfolio/performance", handlers.GetPerformance)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("Server starting on port %s\n", port)
	log.Fatal(app.Listen(":" + port))
}
