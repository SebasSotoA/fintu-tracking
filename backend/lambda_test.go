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

func TestHandleLambdaUnifiedEvent(t *testing.T) {
	httpEvent := map[string]interface{}{
		"httpMethod": "GET",
		"path":       "/health",
		"headers":    map[string]interface{}{},
		"body":       "",
	}

	tests := []struct {
		name      string
		event     interface{}
		setup     func(t *testing.T)
		wantErr   bool
		errSubstr string
		check     func(t *testing.T, result interface{}, err error)
	}{
		{
			name:      "rejects non-map event",
			event:     "not-a-map",
			wantErr:   true,
			errSubstr: "unsupported event type",
		},
		{
			name:  "routes API Gateway v1 HTTP",
			event: httpEvent,
			check: func(t *testing.T, result interface{}, err error) {
				t.Helper()
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
			},
		},
		{
			name: "unknown type falls through to HTTP adapter",
			event: map[string]interface{}{
				"type":       "custom-unknown",
				"httpMethod": "GET",
				"path":       "/health",
				"headers":    map[string]interface{}{},
				"body":       "",
			},
			check: func(t *testing.T, result interface{}, err error) {
				t.Helper()
				if err != nil {
					t.Fatalf("handleLambdaUnifiedEvent: %v", err)
				}
				if _, ok := result.(events.APIGatewayProxyResponse); !ok {
					t.Fatalf("result type = %T, want events.APIGatewayProxyResponse", result)
				}
			},
		},
		{
			name: "database-status returns status field",
			event: map[string]interface{}{
				"type": "database-status",
			},
			check: func(t *testing.T, result interface{}, err error) {
				t.Helper()
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
			},
		},
		{
			name: "user-migration returns status field",
			event: map[string]interface{}{
				"type": "user-migration",
			},
			setup: func(t *testing.T) {
				t.Helper()
				t.Setenv("MIGRATIONS_SOURCE", "embed")
				t.Setenv("DATABASE_URL", "")
			},
			check: func(t *testing.T, result interface{}, err error) {
				t.Helper()
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
			},
		},
		{
			name: "database-reset is not supported",
			event: map[string]interface{}{
				"type": "database-reset",
			},
			wantErr: true,
		},
		{
			name: "database-seeder is not supported",
			event: map[string]interface{}{
				"type": "database-seeder",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			if tt.setup == nil {
				t.Parallel()
			}
			if tt.setup != nil {
				tt.setup(t)
			}

			result, err := handleLambdaUnifiedEvent(context.Background(), nil, stubHTTPAdapter(), tt.event)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error")
				}
				if tt.errSubstr != "" && !strings.Contains(err.Error(), tt.errSubstr) {
					t.Fatalf("error = %q, want substring %q", err.Error(), tt.errSubstr)
				}
				return
			}
			if tt.check == nil {
				t.Fatal("test must set check or wantErr")
			}
			tt.check(t, result, err)
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
