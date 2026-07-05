package main

import (
	"context"
	"net/http"
	"strings"
	"testing"

	"github.com/aws/aws-lambda-go/events"
	"github.com/its-felix/aws-lambda-go-http-adapter/handler"
)

func TestHandleLambdaUnifiedEvent_rejectsNonMapEvent(t *testing.T) {
	t.Parallel()

	_, err := handleLambdaUnifiedEvent(context.Background(), nil, stubHTTPAdapter(), "not-a-map")
	if err == nil {
		t.Fatal("expected error for non-map event")
	}
	if !strings.Contains(err.Error(), "unsupported event type") {
		t.Fatalf("error = %q, want unsupported event type", err.Error())
	}
}

func TestHandleLambdaUnifiedEvent_routesHTTPAPIGatewayV1(t *testing.T) {
	t.Parallel()

	event := map[string]interface{}{
		"httpMethod": "GET",
		"path":       "/health",
		"headers":    map[string]interface{}{},
		"body":       "",
	}

	result, err := handleLambdaUnifiedEvent(context.Background(), nil, stubHTTPAdapter(), event)
	if err != nil {
		t.Fatalf("handleLambdaUnifiedEvent: %v", err)
	}

	resp, ok := result.(events.APIGatewayProxyResponse)
	if !ok {
		t.Fatalf("result type = %T, want events.APIGatewayProxyResponse", result)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("statusCode = %d, want %d", resp.StatusCode, http.StatusOK)
	}
}

func stubHTTPAdapter() handler.AdapterFunc {
	return func(ctx context.Context, r *http.Request, w http.ResponseWriter) error {
		w.WriteHeader(http.StatusOK)
		_, err := w.Write([]byte(`{"status":"ok"}`))
		return err
	}
}
