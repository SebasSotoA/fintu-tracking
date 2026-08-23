package httpx

import (
	"encoding/json"
	"net/http"
)

// JSON writes a JSON response with the given status code.
func JSON(w http.ResponseWriter, code int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(body)
}

// Error writes a JSON error response with the given status code and message.
func Error(w http.ResponseWriter, code int, msg string) {
	JSON(w, code, map[string]any{"error": msg})
}