package config

import (
	"slices"
	"testing"
)

func TestDefaultCurrencyPair(t *testing.T) {
	want := "USD/COP"
	if DefaultCurrencyPair != want {
		t.Fatalf("DefaultCurrencyPair = %q, want %q", DefaultCurrencyPair, want)
	}
}

func TestInverseCurrencyPair(t *testing.T) {
	want := "COP/USD"
	if InverseCurrencyPair != want {
		t.Fatalf("InverseCurrencyPair = %q, want %q", InverseCurrencyPair, want)
	}
}

func TestSupportedCurrencyPairs(t *testing.T) {
	if len(SupportedCurrencyPairs) != 2 {
		t.Fatalf("len(SupportedCurrencyPairs) = %d, want 2", len(SupportedCurrencyPairs))
	}
	if !slices.Contains(SupportedCurrencyPairs, DefaultCurrencyPair) {
		t.Fatalf("SupportedCurrencyPairs missing default pair %q", DefaultCurrencyPair)
	}
	if !slices.Contains(SupportedCurrencyPairs, InverseCurrencyPair) {
		t.Fatalf("SupportedCurrencyPairs missing inverse pair %q", InverseCurrencyPair)
	}
}

func TestTwelveDataSource(t *testing.T) {
	if TwelveDataSource == "" {
		t.Fatal("TwelveDataSource must not be empty")
	}
}

func TestDefaultMarketCurrency(t *testing.T) {
	want := "USD"
	if DefaultMarketCurrency != want {
		t.Fatalf("DefaultMarketCurrency = %q, want %q", DefaultMarketCurrency, want)
	}
}
