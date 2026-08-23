package middleware

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"fintu-tracking-backend/internal/httpx"
)

type ctxKey int

const userCtxKey ctxKey = 0

// UserCtxKey returns the context key under which the authenticated user ID is stored.
// Exported so tests in other packages can inject a user ID without going through AuthMiddleware.
func UserCtxKey() any { return userCtxKey }

// publicKeyCache holds all keys from the JWKS indexed by kid
var publicKeyCache map[string]*ecdsa.PublicKey
var publicKeyCacheTime time.Time

// JWK represents a JSON Web Key
type JWK struct {
	Kid string `json:"kid"`
	Kty string `json:"kty"`
	Crv string `json:"crv"`
	X   string `json:"x"`
	Y   string `json:"y"`
	Alg string `json:"alg"`
	Use string `json:"use"`
}

// JWKS represents a set of JSON Web Keys
type JWKS struct {
	Keys []JWK `json:"keys"`
}

// getSupabasePublicKey fetches and caches all JWKS keys, returning the one matching kid.
// If kid is empty, the first key is returned for backwards compatibility.
func getSupabasePublicKey(kid string) (*ecdsa.PublicKey, error) {
	// Refresh cache if empty or older than 1 hour
	if publicKeyCache == nil || time.Since(publicKeyCacheTime) >= time.Hour {
		if err := refreshJWKSCache(); err != nil {
			// If refresh fails but we have a stale cache, keep using it
			if publicKeyCache == nil {
				return nil, err
			}
		}
	}

	if kid != "" {
		if key, ok := publicKeyCache[kid]; ok {
			return key, nil
		}
		// kid not found in cache — force a refresh and try once more
		if err := refreshJWKSCache(); err != nil {
			return nil, fmt.Errorf("failed to refresh JWKS after unknown kid %q: %w", kid, err)
		}
		if key, ok := publicKeyCache[kid]; ok {
			return key, nil
		}
		return nil, fmt.Errorf("no JWKS key found for kid %q", kid)
	}

	// Fallback: return any key (first inserted)
	for _, key := range publicKeyCache {
		return key, nil
	}
	return nil, fmt.Errorf("JWKS cache is empty")
}

// refreshJWKSCache fetches the JWKS from Supabase and rebuilds the cache.
func refreshJWKSCache() error {
	supabaseURL := os.Getenv("SUPABASE_URL")
	if supabaseURL == "" {
		return fmt.Errorf("SUPABASE_URL not set")
	}

	jwksURL := supabaseURL + "/auth/v1/.well-known/jwks.json"

	resp, err := http.Get(jwksURL)
	if err != nil {
		return fmt.Errorf("failed to fetch JWKS from %s: %w", jwksURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("JWKS endpoint returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read JWKS response: %w", err)
	}

	var jwks JWKS
	if err := json.Unmarshal(body, &jwks); err != nil {
		return fmt.Errorf("failed to parse JWKS: %w", err)
	}

	if len(jwks.Keys) == 0 {
		return fmt.Errorf("no keys found in JWKS response")
	}

	newCache := make(map[string]*ecdsa.PublicKey, len(jwks.Keys))
	for _, jwk := range jwks.Keys {
		xBytes, err := base64.RawURLEncoding.DecodeString(jwk.X)
		if err != nil {
			return fmt.Errorf("failed to decode X for kid %q: %w", jwk.Kid, err)
		}
		yBytes, err := base64.RawURLEncoding.DecodeString(jwk.Y)
		if err != nil {
			return fmt.Errorf("failed to decode Y for kid %q: %w", jwk.Kid, err)
		}

		pubKey := &ecdsa.PublicKey{
			Curve: elliptic.P256(),
			X:     new(big.Int).SetBytes(xBytes),
			Y:     new(big.Int).SetBytes(yBytes),
		}
		newCache[jwk.Kid] = pubKey
	}

	publicKeyCache = newCache
	publicKeyCacheTime = time.Now()
	return nil
}

// AuthMiddleware validates Supabase JWT tokens (supports both HS256 and ES256)
func AuthMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				httpx.Error(w, http.StatusUnauthorized, "Missing authorization header")
				return
			}

			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				httpx.Error(w, http.StatusUnauthorized, "Invalid authorization header format")
				return
			}

			tokenString := parts[1]

			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				switch token.Method.(type) {
				case *jwt.SigningMethodHMAC:
					secret := os.Getenv("SUPABASE_JWT_SECRET")
					if secret == "" {
						return nil, fmt.Errorf("SUPABASE_JWT_SECRET not set")
					}
					return []byte(secret), nil

				case *jwt.SigningMethodECDSA:
					// Extract kid from token header for correct key selection
					kid, _ := token.Header["kid"].(string)
					pubKey, err := getSupabasePublicKey(kid)
					if err != nil {
						return nil, fmt.Errorf("failed to get public key: %w", err)
					}
					return pubKey, nil

				default:
					return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
				}
			})

			if err != nil || !token.Valid {
				httpx.Error(w, http.StatusUnauthorized, fmt.Sprintf("Invalid or expired token: %v", err))
				return
			}

			if claims, ok := token.Claims.(jwt.MapClaims); ok {
				if sub, ok := claims["sub"].(string); ok {
					ctx := context.WithValue(r.Context(), userCtxKey, sub)
					next.ServeHTTP(w, r.WithContext(ctx))
					return
				}
			}

			httpx.Error(w, http.StatusUnauthorized, "Invalid token claims")
		})
	}
}

// GetUserID retrieves the user ID from the request context.
func GetUserID(r *http.Request) string {
	userID, _ := r.Context().Value(userCtxKey).(string)
	return userID
}

// RequireUserID returns the authenticated user ID and whether it is present.
// When the second return value is false, the caller is responsible for writing
// the 401 response.
func RequireUserID(r *http.Request) (string, bool) {
	userID := GetUserID(r)
	if userID == "" {
		return "", false
	}
	return userID, true
}
