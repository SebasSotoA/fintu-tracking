package services

import (
	"testing"

	"github.com/shopspring/decimal"
)

func TestSellProceeds(t *testing.T) {
	t.Parallel()
	got := sellProceeds(plDec("0.6651"), plDec("60.33"), plDec("0.17"))
	want := plDec("0.6651").Mul(plDec("60.33")).Sub(plDec("0.17"))
	if !got.Equal(want) {
		t.Fatalf("proceeds = %s want %s", got, want)
	}
}

func plDec(s string) decimal.Decimal {
	d, err := decimal.NewFromString(s)
	if err != nil {
		panic(err)
	}
	return d
}
