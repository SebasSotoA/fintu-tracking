// Package config holds market-specific defaults shared across the backend.
// Centralizing these values makes it possible to add new countries, currencies,
// and brokers without scattering literals through handlers and services.
package config

import "time"

// Currency codes for the current default market (Colombia / Hapi).
const (
	BaseCurrency   = "USD"
	LocalCurrency  = "COP"
	DefaultCurrencyPair = BaseCurrency + "/" + LocalCurrency
	InverseCurrencyPair = LocalCurrency + "/" + BaseCurrency
)

// Market-data provider defaults.
const (
	TwelveDataSource    = "twelve-data"
	TwelveDataBaseURL   = "https://api.twelvedata.com"
	DefaultMarketCurrency = BaseCurrency
)

// Cache and chart defaults.
const (
	MarketDataCacheTTL    = 24 * time.Hour
	MarketPriceCooldown   = 60 * time.Second
	DefaultFXRateDays     = 30
	MaxFXRateDays         = 90
)

// SupportedCurrencyPairs returns the currency pairs the current FX handlers support.
func SupportedCurrencyPairs() []string {
	return []string{DefaultCurrencyPair, InverseCurrencyPair}
}
