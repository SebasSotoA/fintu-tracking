package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"fintu-tracking-backend/internal/database"
	"fintu-tracking-backend/internal/migrations"
	"fintu-tracking-backend/internal/server"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/jackc/pgx/v5/pgxpool"
	felixadapter "github.com/its-felix/aws-lambda-go-http-adapter/adapter"
	"github.com/its-felix/aws-lambda-go-http-adapter/handler"
)

// LambdaStart starts the Lambda handler using a unified event dispatcher.
func LambdaStart(deps *server.Deps) {
	app := server.NewApp(deps)
	httpAdapter := felixadapter.NewVanillaAdapter(app)

	lambda.Start(func(ctx context.Context, event interface{}) (interface{}, error) {
		return handleLambdaUnifiedEvent(ctx, deps, httpAdapter, event)
	})
}

// handleLambdaUnifiedEvent routes incoming Lambda events to the appropriate handler.
func handleLambdaUnifiedEvent(ctx context.Context, deps *server.Deps, httpAdapter handler.AdapterFunc, event interface{}) (interface{}, error) {
	eventMap, ok := event.(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("unsupported event type: %T", event)
	}

	if eventType, hasType := eventMap["type"]; hasType {
		switch eventType.(string) {
		case "database-status":
			return handleDatabaseStatus(ctx)
		case "user-migration":
			return handleUserMigration(ctx)
		case "refresh-market-prices":
			return handleRefreshMarketPrices(ctx, deps)
		}
	}

	return handleLambdaRawEvent(ctx, eventMap, httpAdapter)
}

// handleLambdaRawEvent converts a raw map event to a typed API Gateway or Function URL struct.
func handleLambdaRawEvent(ctx context.Context, eventMap map[string]interface{}, httpAdapter handler.AdapterFunc) (interface{}, error) {
	eventJSON, err := json.Marshal(eventMap)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal event: %w", err)
	}

	if _, hasRawPath := eventMap["rawPath"]; hasRawPath {
		if v, ok := eventMap["version"].(string); ok && v == "2.0" {
			if _, hasRouteKey := eventMap["routeKey"]; !hasRouteKey {
				var req events.LambdaFunctionURLRequest
				if err := json.Unmarshal(eventJSON, &req); err != nil {
					return nil, fmt.Errorf("failed to unmarshal Function URL event: %w", err)
				}
				return handler.NewFunctionURLHandler(httpAdapter)(ctx, req)
			}
		}
	}

	if _, hasMethod := eventMap["httpMethod"]; hasMethod {
		var req events.APIGatewayProxyRequest
		if err := json.Unmarshal(eventJSON, &req); err != nil {
			return nil, fmt.Errorf("failed to unmarshal API Gateway v1 event: %w", err)
		}
		return handler.NewAPIGatewayV1Handler(httpAdapter)(ctx, req)
	}

	if _, hasRouteKey := eventMap["routeKey"]; hasRouteKey {
		if v, ok := eventMap["version"].(string); ok && v == "2.0" {
			var req events.APIGatewayV2HTTPRequest
			if err := json.Unmarshal(eventJSON, &req); err != nil {
				return nil, fmt.Errorf("failed to unmarshal API Gateway v2 event: %w", err)
			}
			return handler.NewAPIGatewayV2Handler(httpAdapter)(ctx, req)
		}
	}

	return nil, fmt.Errorf("could not determine event type from map keys: %v", mapKeys(eventMap))
}

func handleDatabaseStatus(ctx context.Context) (map[string]interface{}, error) {
	pool := database.GetPool()
	if pool == nil {
		return invokeJSONResponse(http.StatusOK, map[string]interface{}{
			"status": "error",
			"error":  "database pool not initialized",
		})
	}

	payload := map[string]interface{}{
		"status": "ok",
		"pool":   poolStats(pool),
	}
	if err := pool.Ping(ctx); err != nil {
		payload["status"] = "error"
		payload["error"] = err.Error()
	}

	return invokeJSONResponse(http.StatusOK, payload)
}

func handleUserMigration(ctx context.Context) (map[string]interface{}, error) {
	if err := ctx.Err(); err != nil {
		return invokeJSONResponse(http.StatusOK, map[string]interface{}{
			"status": "error",
			"error":  err.Error(),
		})
	}

	migrationDB, err := database.OpenMigrationDB()
	if err != nil {
		return invokeJSONResponse(http.StatusOK, map[string]interface{}{
			"status": "error",
			"error":  err.Error(),
		})
	}
	defer migrationDB.Close()

	if err := migrations.Up(migrationDB, server.ResolveMigrationsDir()); err != nil {
		return invokeJSONResponse(http.StatusOK, map[string]interface{}{
			"status": "error",
			"error":  err.Error(),
		})
	}

	return invokeJSONResponse(http.StatusOK, map[string]interface{}{
		"status":  "ok",
		"message": "migrations applied",
	})
}

func handleRefreshMarketPrices(ctx context.Context, deps *server.Deps) (map[string]interface{}, error) {
	if err := ctx.Err(); err != nil {
		return invokeJSONResponse(http.StatusOK, map[string]interface{}{
			"status": "error",
			"error":  err.Error(),
		})
	}

	result, err := deps.TwelveDataSvc.RefreshAllMarketPrices(ctx)
	if err != nil {
		return invokeJSONResponse(http.StatusOK, map[string]interface{}{
			"status":  "error",
			"error":   err.Error(),
			"updated": result.Updated,
			"skipped": result.Skipped,
			"tickers": result.Tickers,
			"errors":  result.Errors,
		})
	}

	return invokeJSONResponse(http.StatusOK, map[string]interface{}{
		"status":  "ok",
		"updated": result.Updated,
		"skipped": result.Skipped,
		"tickers": result.Tickers,
		"errors":  result.Errors,
	})
}

func invokeJSONResponse(statusCode int, payload map[string]interface{}) (map[string]interface{}, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal invoke response: %w", err)
	}
	return map[string]interface{}{
		"statusCode": statusCode,
		"body":       string(body),
	}, nil
}

func poolStats(pool *pgxpool.Pool) map[string]int32 {
	stat := pool.Stat()
	return map[string]int32{
		"total_conns":    stat.TotalConns(),
		"acquired_conns": stat.AcquiredConns(),
		"idle_conns":     stat.IdleConns(),
		"max_conns":      stat.MaxConns(),
	}
}

func mapKeys(m map[string]interface{}) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}
