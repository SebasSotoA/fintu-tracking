package handlers

import "testing"

func TestValidateFeeLinkage(t *testing.T) {
	t.Parallel()

	relatedCashFlowID := "parent-cf-id"
	relatedTradeID := "trade-id"

	tests := []struct {
		name              string
		flowType          string
		relatedCashFlowID *string
		relatedTradeID    *string
		wantErr           bool
	}{
		{
			name:     "non-fee allows nil links",
			flowType: "deposit",
			wantErr:  false,
		},
		{
			name:              "fee allows related cash flow link",
			flowType:          "fee",
			relatedCashFlowID: &relatedCashFlowID,
			wantErr:           false,
		},
		{
			name:           "fee allows related trade link",
			flowType:       "fee",
			relatedTradeID: &relatedTradeID,
			wantErr:        false,
		},
		{
			name:     "fee rejects standalone row",
			flowType: "fee",
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			err := validateFeeLinkage(tt.flowType, tt.relatedCashFlowID, tt.relatedTradeID)
			if tt.wantErr && err == nil {
				t.Fatal("expected error, got nil")
			}
			if !tt.wantErr && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if tt.wantErr && err.Error() != "Standalone fees are not supported; fees must be linked to a deposit, withdrawal, or trade" {
				t.Fatalf("error = %q", err.Error())
			}
		})
	}
}
