package main

import (
	"context"
	"encoding/json"
	"fmt"

	"fintu-tracking-backend/internal/server"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/gofiber/fiber/v3/middleware/adaptor"
	felixadapter "github.com/its-felix/aws-lambda-go-http-adapter/adapter"
	"github.com/its-felix/aws-lambda-go-http-adapter/handler"
)

// LambdaStart starts the Lambda handler using a unified event dispatcher.
func LambdaStart(deps *server.Deps) {
	app := server.NewApp(deps)
	httpAdapter := felixadapter.NewVanillaAdapter(adaptor.FiberApp(app))

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
		switch eventType {
		// Custom invoke events (database-status, user-migration) added in T-04.
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

func mapKeys(m map[string]interface{}) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}
