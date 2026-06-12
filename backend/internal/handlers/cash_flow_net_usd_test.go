package handlers

import (
	"testing"

	"github.com/shopspring/decimal"
)

func TestComputeGrossUsd_COPExample(t *testing.T) {
	t.Parallel()

	amount := decimal.RequireFromString("1199475")
	fxRate := decimal.RequireFromString("3702.1975")

	gross, err := computeGrossUsd("COP", amount, &fxRate)
	if err != nil {
		t.Fatalf("computeGrossUsd: %v", err)
	}

	want := decimal.RequireFromString("323.99")
	if !gross.Round(2).Equal(want) {
		t.Fatalf("gross = %s, want %s", gross.Round(2), want)
	}
}

func TestComputeNetTransferUsd_COPExampleWithFee(t *testing.T) {
	t.Parallel()

	amount := decimal.RequireFromString("1199475")
	fxRate := decimal.RequireFromString("3702.1975")
	fee := decimal.RequireFromString("1.99")

	gross, err := computeGrossUsd("COP", amount, &fxRate)
	if err != nil {
		t.Fatalf("computeGrossUsd: %v", err)
	}

	net := computeNetTransferUsd(gross, []decimal.Decimal{fee})
	want := decimal.RequireFromString("322.00")
	if !net.Round(2).Equal(want) {
		t.Fatalf("net = %s, want %s", net.Round(2), want)
	}
}

func TestComputeNetTransferUsd_NoLinkedFees(t *testing.T) {
	t.Parallel()

	gross := decimal.RequireFromString("100")
	net := computeNetTransferUsd(gross, nil)
	if !net.Equal(gross) {
		t.Fatalf("net = %s, want %s", net, gross)
	}
}
