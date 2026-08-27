package server

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"fintu-tracking-backend/internal/database"
	"fintu-tracking-backend/internal/handlers"
	"fintu-tracking-backend/internal/httpx"
	mw "fintu-tracking-backend/internal/middleware"
	"fintu-tracking-backend/internal/repositories"
	"fintu-tracking-backend/internal/services"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/rs/cors"
)

// Deps holds wired services required to build the Fiber application.
type Deps struct {
	BillingSvc     *services.BillingService
	TwelveDataSvc  *services.TwelveDataService
}

// Bootstrap connects to the database and initializes handler service singletons.
func Bootstrap(ctx context.Context) (*Deps, error) {
	if err := ctx.Err(); err != nil {
		return nil, fmt.Errorf("bootstrap: %w", err)
	}

	if err := database.Connect(); err != nil {
		return nil, fmt.Errorf("database connect: %w", err)
	}

	pool := database.GetPool()

	// Repositories
	billingRepo := repositories.NewPostgresBillingRepository(pool)
	brokerRepo := repositories.NewPostgresBrokerRepository(pool)
	profileRepo := repositories.NewPostgresProfileRepository(pool)
	feeRepo := repositories.NewPostgresFeeRepository(pool)
	analyticsRepo := repositories.NewPostgresAnalyticsRepository(pool)
	marketDataStore := repositories.NewPostgresMarketDataStore(pool)

	// Services
	billingProvider := services.NewNoOpBillingProvider()
	billingSvc := services.NewBillingService(billingRepo, billingProvider)
	brokerSvc := services.NewBrokerService(brokerRepo)
	profileSvc := services.NewProfileService(profileRepo, billingSvc, brokerSvc)
	exchangeRateSvc := services.NewExchangeRateService(marketDataStore)
	twelveDataSvc := services.NewTwelveDataService(marketDataStore)
	feeSvc := services.NewFeeService(feeRepo)
	analyticsSvc := services.NewAnalyticsService(analyticsRepo)

	// Wire into handlers
	handlers.InitBillingService(billingSvc)
	handlers.InitExchangeRateService(exchangeRateSvc)
	handlers.InitTwelveDataService(twelveDataSvc)
	handlers.InitBrokerService(brokerSvc)
	handlers.InitProfileService(profileSvc)
	handlers.InitFeeService(feeSvc)
	handlers.InitAnalyticsService(analyticsSvc)

	return &Deps{BillingSvc: billingSvc, TwelveDataSvc: twelveDataSvc}, nil
}

// Close releases database resources held by Bootstrap.
func (d *Deps) Close() {
	database.Close()
}

// NewApp builds a Chi router with middleware and all API routes.
//
// Lambda runtime env (wired in Phase 4.2): DATABASE_URL, SUPABASE_URL,
// SUPABASE_JWT_SECRET, FRONTEND_URL, TWELVE_DATA_API_KEY, DB_MAX_OPEN_CONNS,
// DB_MAX_IDLE_CONNS.
func NewApp(deps *Deps) chi.Router {
	warnLambdaMissingFrontendURL()

	r := chi.NewRouter()
	r.Use(chimw.Recoverer)
	r.Use(chimw.Logger)

	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   corsAllowOrigins(),
		AllowedHeaders:   []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowCredentials: false,
		Debug:            false,
	})
	r.Use(corsHandler.Handler)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]any{
			"status":  "ok",
			"service": "fintu-tracking-api",
		})
	})

	r.Route("/api", func(r chi.Router) {
		// Cron endpoints: authenticated via X-Cron-Secret, not JWT.
		r.Post("/cron/refresh-prices", handlers.RefreshAllMarketPricesCron)

		r.Group(func(r chi.Router) {
			r.Use(mw.AuthMiddleware())

			r.Get("/me", handlers.GetMe)
			r.Patch("/me/onboarding", handlers.UpdateOnboarding)
			r.Patch("/me/profile", handlers.UpdateProfile)

			r.Get("/plans", handlers.ListPlans)
			r.Get("/subscriptions/current", handlers.GetSubscription)
			r.Post("/subscriptions", handlers.CreateSubscription)
			r.Patch("/subscriptions/{id}/cancel", handlers.CancelSubscription)

			r.Get("/brokers", handlers.ListBrokers)
			r.Post("/brokers", handlers.CreateBroker)

			r.Group(func(r chi.Router) {
				r.Use(mw.RequireActivePlan(deps.BillingSvc))

				r.Get("/fx-rates/current", handlers.GetCurrentRate)
				r.Get("/fx-rates/chart", handlers.GetFxRateChart)
				r.Get("/fx-rates", handlers.ListFxRates)
				r.Post("/fx-rates", handlers.CreateFxRate)
				r.Put("/fx-rates/{id}", handlers.UpdateFxRate)
				r.Delete("/fx-rates/{id}", handlers.DeleteFxRate)

				r.Get("/cash-flows", handlers.ListCashFlows)
				r.Post("/cash-flows", handlers.CreateCashFlow)
				r.Put("/cash-flows/{id}", handlers.UpdateCashFlow)
				r.Delete("/cash-flows/{id}", handlers.DeleteCashFlow)

				r.Get("/trade-tickers", handlers.ListTradeTickers)
				r.Get("/trades", handlers.ListTrades)
				r.Post("/trades", handlers.CreateTrade)
				r.Put("/trades/{id}", handlers.UpdateTrade)
				r.Delete("/trades/{id}", handlers.DeleteTrade)

				r.Get("/market-prices", handlers.ListMarketPrices)
				r.Get("/market-prices/{ticker}", handlers.GetMarketPrice)
				r.Post("/market-prices/refresh", handlers.RefreshMarketPrices)

				r.Get("/portfolio/holdings", handlers.GetHoldings)

				r.Get("/analytics/fee-breakdown", handlers.GetFeeBreakdown)
				r.Get("/analytics/fee-impact", handlers.GetFeeImpact)
				r.Get("/analytics/fee-efficiency", handlers.GetFeeEfficiency)
				r.Get("/analytics/return-attribution", handlers.GetReturnAttribution)
				r.Get("/analytics/fx-impact", handlers.GetFXImpact)
				r.Get("/analytics/performance-time-series", handlers.GetPerformanceTimeSeries)
				r.Get("/analytics/net-worth", handlers.GetNetWorth)
				r.Get("/analytics/cash-reconciliation", handlers.GetCashReconciliation)

				r.Get("/activity/feed", handlers.GetActivityFeed)
			})
		})
	})

	return r
}

func corsAllowOrigins() []string {
	origins := []string{"http://localhost:3000", "http://localhost:3001", "http://localhost:3002"}
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
