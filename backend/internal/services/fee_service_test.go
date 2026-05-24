package services

import (
	"testing"

	"github.com/shopspring/decimal"
)

func TestFeeTotalsMismatch(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		diff  string
		want  bool
	}{
		{"zero", "0", false},
		{"within tolerance", "0.005", false},
		{"at tolerance boundary", "0.01", false},
		{"above tolerance", "0.15", true},
		{"negative above tolerance", "-0.15", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			d, err := decimal.NewFromString(tt.diff)
			if err != nil {
				t.Fatalf("parse diff: %v", err)
			}
			if got := feeTotalsMismatch(d); got != tt.want {
				t.Errorf("feeTotalsMismatch(%s) = %v, want %v", tt.diff, got, tt.want)
			}
		})
	}
}
