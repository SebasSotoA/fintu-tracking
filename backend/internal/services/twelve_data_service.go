package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"fintu-tracking-backend/internal/config"
)

// RefreshResult summarizes a market price refresh run.
type RefreshResult struct {
	Updated int      `json:"updated"`
	Skipped int      `json:"skipped"`
	Tickers []string `json:"tickers"`
	Errors  []string `json:"errors"`
}

// TwelveDataService fetches equity quotes from Twelve Data and upserts market_prices
// through the shared Postgres TTL cache.
type TwelveDataService struct {
	apiKey     string
	httpClient *http.Client
	store      MarketDataStore
	baseURL    string
}

// NewTwelveDataService creates a service backed by the given store.
func NewTwelveDataService(store MarketDataStore) *TwelveDataService {
	return &TwelveDataService{
		apiKey:     os.Getenv("TWELVE_DATA_API_KEY"),
		store:      store,
		httpClient: &http.Client{Timeout: 15 * time.Second},
		baseURL:    config.TwelveDataBaseURL,
	}
}

// ConfigureForTesting overrides the HTTP client and base URL used by the service.
// It is intended for use in tests that need to point the service at a mock server.
func (s *TwelveDataService) ConfigureForTesting(httpClient *http.Client, baseURL, apiKey string) {
	s.httpClient = httpClient
	s.baseURL = baseURL
	s.apiKey = apiKey
}

type quoteResponse struct {
	Symbol   string `json:"symbol"`
	Currency string `json:"currency"`
	Datetime string `json:"datetime"`
	Close    string `json:"close"`
	Status   string `json:"status"`
	Code     int    `json:"code"`
	Message  string `json:"message"`
}

func (r *quoteResponse) isError() bool {
	return strings.EqualFold(strings.TrimSpace(r.Status), "error")
}

func (r *quoteResponse) errorMessage() string {
	if msg := strings.TrimSpace(r.Message); msg != "" {
		return msg
	}
	if r.Code != 0 {
		return fmt.Sprintf("API error (code %d)", r.Code)
	}
	return "unknown API error"
}

// BatchPrice holds the latest price and currency for a single ticker returned by the
// Twelve Data batch /price endpoint.
type BatchPrice struct {
	Price    string
	Currency string
}

// batchPriceResponse models the Twelve Data batch /price response, which maps each
// ticker to an object containing its price (and, when provided, currency).
type batchPriceResponse map[string]struct {
	Price    string `json:"price"`
	Currency string `json:"currency"`
}

// SearchResult represents a single symbol search match from Twelve Data.
type SearchResult struct {
	Symbol    string `json:"symbol"`
	Name      string `json:"name"`
	AssetType string `json:"asset_type"`
}

// FetchBatchPrices fetches the latest price for every ticker in a single batched call
// to Twelve Data's /price endpoint. Tickers are split into chunks of
// config.MaxBatchSymbols to keep requests within provider limits. The returned map is
// keyed by the bare stored ticker (e.g. "BTC", not "BTC/USD").
func (s *TwelveDataService) FetchBatchPrices(ctx context.Context, tickers []HeldTicker) (map[string]BatchPrice, error) {
	if s.apiKey == "" {
		return nil, fmt.Errorf("TWELVE_DATA_API_KEY environment variable is not set")
	}

	normalized := make([]HeldTicker, 0, len(tickers))
	for _, ht := range tickers {
		ticker := strings.TrimSpace(strings.ToUpper(ht.Ticker))
		if ticker != "" {
			normalized = append(normalized, HeldTicker{Ticker: ticker, AssetType: ht.AssetType})
		}
	}
	if len(normalized) == 0 {
		return map[string]BatchPrice{}, nil
	}

	base := s.baseURL
	if base == "" {
		base = config.TwelveDataBaseURL
	}
	base = strings.TrimRight(base, "/")

	results := make(map[string]BatchPrice, len(normalized))

	for start := 0; start < len(normalized); start += config.MaxBatchSymbols {
		select {
		case <-ctx.Done():
			return results, ctx.Err()
		default:
		}

		end := start + config.MaxBatchSymbols
		if end > len(normalized) {
			end = len(normalized)
		}
		chunk := normalized[start:end]

		batch, err := s.fetchBatchChunk(ctx, base, chunk)
		if err != nil {
			return results, err
		}
		for ticker, price := range batch {
			results[ticker] = price
		}
	}

	return results, nil
}

// FormatSymbol converts a bare ticker into the symbol format expected by Twelve Data.
// Crypto symbols need a /USD suffix (e.g. BTC → BTC/USD); stocks and ETFs use the bare ticker.
func FormatSymbol(ticker, assetType string) string {
	ticker = strings.TrimSpace(strings.ToUpper(ticker))
	if assetType == "crypto" && !strings.Contains(ticker, "/") {
		return ticker + "/USD"
	}
	return ticker
}

// SearchSymbols queries Twelve Data's /symbol_search endpoint for tickers matching the query.
// Returns up to 20 results sorted by relevance.
func (s *TwelveDataService) SearchSymbols(ctx context.Context, query string) ([]SearchResult, error) {
	if s.apiKey == "" {
		return nil, fmt.Errorf("TWELVE_DATA_API_KEY environment variable is not set")
	}

	query = strings.TrimSpace(query)
	if len(query) < 1 {
		return nil, fmt.Errorf("query must be at least 1 character")
	}

	base := s.baseURL
	if base == "" {
		base = config.TwelveDataBaseURL
	}

	apiURL := fmt.Sprintf(
		"%s/symbol_search?symbol=%s&apikey=%s",
		strings.TrimRight(base, "/"),
		url.QueryEscape(query),
		url.QueryEscape(s.apiKey),
	)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("search request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read search response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("symbol_search returned HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var envelope struct {
		Data []struct {
			Symbol         string `json:"symbol"`
			InstrumentName string `json:"instrument_name"`
			InstrumentType string `json:"instrument_type"`
			Exchange       string `json:"exchange"`
		} `json:"data"`
		Status string `json:"status"`
	}
	if err := json.Unmarshal(body, &envelope); err != nil {
		return nil, fmt.Errorf("failed to decode search response: %w", err)
	}

	results := make([]SearchResult, 0, len(envelope.Data))
	for _, r := range envelope.Data {
		symbol := strings.TrimSpace(r.Symbol)
		if symbol == "" {
			continue
		}
		displaySymbol := strings.TrimSuffix(strings.ToUpper(symbol), "/USD")
		assetType := normalizeAssetType(r.InstrumentType)
		name := strings.TrimSpace(r.InstrumentName)
		if name == "" {
			name = strings.TrimSpace(r.Exchange)
		}

		results = append(results, SearchResult{
			Symbol:    displaySymbol,
			Name:      name,
			AssetType: assetType,
		})
	}

	if len(results) > 20 {
		results = results[:20]
	}

	return results, nil
}

// FetchQuote returns the latest price, trading day, and currency via the /quote endpoint.
// assetType is used to format the symbol correctly for the provider (e.g. "crypto" → BTC/USD).
func (s *TwelveDataService) FetchQuote(ctx context.Context, ticker, assetType string) (price, latestDay, currency string, err error) {
	if s.apiKey == "" {
		return "", "", "", fmt.Errorf("TWELVE_DATA_API_KEY environment variable is not set")
	}

	ticker = strings.TrimSpace(strings.ToUpper(ticker))
	if ticker == "" {
		return "", "", "", fmt.Errorf("ticker is required")
	}

	formattedSymbol := FormatSymbol(ticker, assetType)

	base := s.baseURL
	if base == "" {
		base = config.TwelveDataBaseURL
	}

	apiURL := fmt.Sprintf(
		"%s/quote?symbol=%s&apikey=%s",
		strings.TrimRight(base, "/"),
		url.QueryEscape(formattedSymbol),
		url.QueryEscape(s.apiKey),
	)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return "", "", "", err
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", "", "", fmt.Errorf("http request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", "", "", fmt.Errorf("failed to read response: %w", err)
	}

	var result quoteResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return "", "", "", fmt.Errorf("failed to decode response: %w", err)
	}

	if resp.StatusCode == http.StatusTooManyRequests {
		return "", "", "", fmt.Errorf("twelve data rate limit: %s", result.errorMessage())
	}

	if result.isError() {
		if result.Code == http.StatusTooManyRequests {
			return "", "", "", fmt.Errorf("twelve data rate limit: %s", result.errorMessage())
		}
		return "", "", "", fmt.Errorf("twelve data API error: %s", result.errorMessage())
	}

	if resp.StatusCode != http.StatusOK {
		return "", "", "", fmt.Errorf("API returned HTTP %d", resp.StatusCode)
	}

	price = strings.TrimSpace(result.Close)
	if price == "" {
		return "", "", "", fmt.Errorf("missing close price in quote for %s", ticker)
	}

	latestDay = strings.TrimSpace(result.Datetime)
	currency = strings.TrimSpace(result.Currency)
	if currency == "" {
		currency = config.DefaultMarketCurrency
	}

	return price, latestDay, currency, nil
}

// RefreshMarketPrices fetches quotes for held tickers whose cached prices are stale or
// missing, then upserts market_prices. Tickers with fresh cached prices are skipped.
func (s *TwelveDataService) RefreshMarketPrices(ctx context.Context, userID string) (RefreshResult, error) {
	result := RefreshResult{
		Tickers: []string{},
		Errors:  []string{},
	}

	if err := s.checkCooldown(ctx, userID); err != nil {
		return result, err
	}

	tickers, err := s.store.ListHeldTickers(ctx, userID)
	if err != nil {
		return result, err
	}

	if len(tickers) == 0 {
		return result, nil
	}

	staleTickers, err := s.listStaleTickers(ctx, tickers)
	if err != nil {
		return result, err
	}

	if len(staleTickers) == 0 {
		result.Skipped = len(tickers)
		if recordErr := s.store.RecordMarketPriceRefresh(ctx, userID); recordErr != nil {
			return result, fmt.Errorf("record refresh: %w", recordErr)
		}
		return result, nil
	}

	prices, err := s.FetchBatchPrices(ctx, staleTickers)
	if err != nil {
		if _, ok := err.(*RateLimitError); ok {
			result.Skipped = len(tickers) - len(staleTickers)
			return result, fmt.Errorf("batch prices rate limited: %w", err)
		}
		return result, fmt.Errorf("batch prices: %w", err)
	}

	for ticker, batch := range prices {
		if upsertErr := s.store.UpsertMarketPrice(ctx, ticker, batch.Price, batch.Currency); upsertErr != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", ticker, upsertErr))
			continue
		}
		result.Updated++
		result.Tickers = append(result.Tickers, ticker)
	}

	result.Skipped = len(tickers) - len(staleTickers)

	if recordErr := s.store.RecordMarketPriceRefresh(ctx, userID); recordErr != nil {
		return result, fmt.Errorf("record refresh: %w", recordErr)
	}

	return result, nil
}

// RefreshAllMarketPrices fetches prices for every ticker held across all users in a
// single batched run. This is the cross-user scheduled EOD refresh: there is no
// per-user cooldown and no RecordMarketPriceRefresh call. Tickers with fresh cached
// prices (within defaultCacheTTL) are skipped.
func (s *TwelveDataService) RefreshAllMarketPrices(ctx context.Context) (RefreshResult, error) {
	result := RefreshResult{
		Tickers: []string{},
		Errors:  []string{},
	}

	tickers, err := s.store.ListAllHeldTickers(ctx)
	if err != nil {
		return result, fmt.Errorf("list all held tickers: %w", err)
	}

	if len(tickers) == 0 {
		return result, nil
	}

	staleTickers, err := s.listStaleTickers(ctx, tickers)
	if err != nil {
		return result, fmt.Errorf("list stale tickers: %w", err)
	}

	if len(staleTickers) == 0 {
		result.Skipped = len(tickers)
		return result, nil
	}

	prices, err := s.FetchBatchPrices(ctx, staleTickers)
	if err != nil {
		if _, ok := err.(*RateLimitError); ok {
			result.Skipped = len(tickers) - len(staleTickers)
			return result, fmt.Errorf("batch prices rate limited: %w", err)
		}
		return result, fmt.Errorf("batch prices: %w", err)
	}

	for ticker, batch := range prices {
		if upsertErr := s.store.UpsertMarketPrice(ctx, ticker, batch.Price, batch.Currency); upsertErr != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", ticker, upsertErr))
			continue
		}
		result.Updated++
		result.Tickers = append(result.Tickers, ticker)
	}

	result.Skipped = len(tickers) - len(staleTickers)

	return result, nil
}

// fetchBatchChunk performs a single batch /price request for the given chunk of
// tickers and returns results keyed by the bare stored ticker (not the
// provider-formatted symbol, e.g. "BTC" not "BTC/USD").
func (s *TwelveDataService) fetchBatchChunk(ctx context.Context, base string, tickers []HeldTicker) (map[string]BatchPrice, error) {
	formatted := make([]string, 0, len(tickers))
	reverseMap := make(map[string]string, len(tickers))
	for _, ht := range tickers {
		sym := FormatSymbol(ht.Ticker, ht.AssetType)
		formatted = append(formatted, sym)
		reverseMap[sym] = ht.Ticker
	}

	symbolParam := strings.Join(formatted, ",")
	apiURL := fmt.Sprintf(
		"%s/price?symbol=%s&apikey=%s",
		base,
		url.QueryEscape(symbolParam),
		url.QueryEscape(s.apiKey),
	)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode == http.StatusTooManyRequests {
		retryAfter := parseRetryAfter(resp.Header.Get("Retry-After"))
		return nil, &RateLimitError{RetryAfter: retryAfter}
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("batch /price returned HTTP %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var parsed batchPriceResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return nil, fmt.Errorf("failed to decode batch response: %w", err)
	}

	results := make(map[string]BatchPrice, len(tickers))
	for _, ht := range tickers {
		sym := FormatSymbol(ht.Ticker, ht.AssetType)
		entry, ok := parsed[sym]
		if !ok {
			log.Printf("twelve_data: ticker %s missing from batch response", sym)
			continue
		}
		price := strings.TrimSpace(entry.Price)
		if price == "" {
			log.Printf("twelve_data: ticker %s returned empty price", sym)
			continue
		}
		currency := strings.TrimSpace(entry.Currency)
		if currency == "" {
			currency = config.DefaultMarketCurrency
		}
		results[ht.Ticker] = BatchPrice{Price: price, Currency: currency}
	}

	return results, nil
}

// normalizeAssetType converts Twelve Data's instrument_type strings to Fintu's internal types.
func normalizeAssetType(tdType string) string {
	tdType = strings.TrimSpace(strings.ToLower(tdType))
	switch {
	case strings.Contains(tdType, "crypto"), strings.Contains(tdType, "digital currency"):
		return "crypto"
	case strings.Contains(tdType, "etf"):
		return "etf"
	default:
		return "stock"
	}
}

// parseRetryAfter converts a Retry-After header value into a Duration. Twelve Data
// returns seconds; if parsing fails or the header is absent a default is used.
func parseRetryAfter(value string) time.Duration {
	value = strings.TrimSpace(value)
	if value == "" {
		return 60 * time.Second
	}
	if seconds, err := strconv.Atoi(value); err == nil && seconds > 0 {
		return time.Duration(seconds) * time.Second
	}
	return 60 * time.Second
}

// checkCooldown returns a RateLimitError if the user has refreshed prices too recently.
func (s *TwelveDataService) checkCooldown(ctx context.Context, userID string) error {
	lastRefresh, ok, err := s.store.GetLastMarketPriceRefresh(ctx, userID)
	if err != nil {
		return fmt.Errorf("check cooldown: %w", err)
	}
	if !ok {
		return nil
	}

	elapsed := time.Since(lastRefresh)
	cooldown := defaultMarketPriceCooldown()
	if elapsed < cooldown {
		return &RateLimitError{RetryAfter: cooldown - elapsed}
	}
	return nil
}

// listStaleTickers returns held tickers that have no cached market price or whose
// cached price is older than the configured TTL.
func (s *TwelveDataService) listStaleTickers(ctx context.Context, tickers []HeldTicker) ([]HeldTicker, error) {
	tickerStrings := make([]string, 0, len(tickers))
	for _, ht := range tickers {
		tickerStrings = append(tickerStrings, ht.Ticker)
	}

	prices, err := s.store.GetMarketPrices(ctx, tickerStrings)
	if err != nil {
		return nil, err
	}

	fresh := make(map[string]bool, len(prices))
	for _, price := range prices {
		if isFresh(price.UpdatedAt, defaultCacheTTL()) {
			fresh[price.Ticker] = true
		}
	}

	stale := make([]HeldTicker, 0, len(tickers))
	for _, ht := range tickers {
		if !fresh[ht.Ticker] {
			stale = append(stale, ht)
		}
	}
	return stale, nil
}
