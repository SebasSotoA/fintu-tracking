package main

import (
	"context"
	"encoding/json"
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

func TestHandleLambdaUnifiedEvent_unknownTypeFallsThroughToHTTP(t *testing.T) {
	t.Parallel()

	event := map[string]interface{}{
		"type":       "custom-unknown",
		"httpMethod": "GET",
		"path":       "/health",
		"headers":    map[string]interface{}{},
		"body":       "",
	}

	result, err := handleLambdaUnifiedEvent(context.Background(), nil, stubHTTPAdapter(), event)
	if err != nil {
		t.Fatalf("handleLambdaUnifiedEvent: %v", err)
	}

	if _, ok := result.(events.APIGatewayProxyResponse); !ok {
		t.Fatalf("result type = %T, want events.APIGatewayProxyResponse", result)
	}
}

func TestHandleLambdaUnifiedEvent_databaseStatusShape(t *testing.T) {
	event := map[string]interface{}{
		"type": "database-status",
	}

	result, err := handleLambdaUnifiedEvent(context.Background(), nil, stubHTTPAdapter(), event)
	if err != nil {
		t.Fatalf("handleLambdaUnifiedEvent: %v", err)
	}

	body, err := assertInvokeMapResult(t, result)
	if err != nil {
		t.Fatal(err)
	}

	status, ok := body["status"].(string)
	if !ok || (status != "ok" && status != "error") {
		t.Fatalf("status = %v, want ok or error", body["status"])
	}
}

func TestHandleLambdaUnifiedEvent_userMigrationShape(t *testing.T) {
	t.Setenv("MIGRATIONS_SOURCE", "embed")
	t.Setenv("DATABASE_URL", "")

	event := map[string]interface{}{
		"type": "user-migration",
	}

	result, err := handleLambdaUnifiedEvent(context.Background(), nil, stubHTTPAdapter(), event)
	if err != nil {
		t.Fatalf("handleLambdaUnifiedEvent: %v", err)
	}

	body, err := assertInvokeMapResult(t, result)
	if err != nil {
		t.Fatal(err)
	}

	status, ok := body["status"].(string)
	if !ok || (status != "ok" && status != "error") {
		t.Fatalf("status = %v, want ok or error", body["status"])
	}
	if status == "error" {
		errMsg, ok := body["error"].(string)
		if !ok || errMsg == "" {
			t.Fatalf("error = %v, want non-empty string when status is error", body["error"])
		}
	}
}

func TestHandleLambdaUnifiedEvent_noDatabaseResetOrSeeder(t *testing.T) {
	for _, eventType := range []string{"database-reset", "database-seeder"} {
		eventType := eventType
		t.Run(eventType, func(t *testing.T) {
			t.Parallel()

			event := map[string]interface{}{
				"type": eventType,
			}

			_, err := handleLambdaUnifiedEvent(context.Background(), nil, stubHTTPAdapter(), event)
			if err == nil {
				t.Fatalf("expected error for unsupported invoke type %q", eventType)
			}
		})
	}
}

func assertInvokeMapResult(t *testing.T, result interface{}) (map[string]interface{}, error) {
	t.Helper()

	resp, ok := result.(map[string]interface{})
	if !ok {
		return nil, &testError{msg: "result type is not map[string]interface{}"}
	}

	raw, ok := resp["body"].(string)
	if !ok {
		return nil, &testError{msg: "invoke response missing body string"}
	}

	var body map[string]interface{}
	if err := json.Unmarshal([]byte(raw), &body); err != nil {
		return nil, &testError{msg: "unmarshal body: " + err.Error()}
	}
	return body, nil
}

type testError struct {
	msg string
}

func (e *testError) Error() string {
	return e.msg
}

func stubHTTPAdapter() handler.AdapterFunc {
	return func(ctx context.Context, r *http.Request, w http.ResponseWriter) error {
		w.WriteHeader(http.StatusOK)
		_, err := w.Write([]byte(`{"status":"ok"}`))
		return err
	}
}
