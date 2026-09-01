package models

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestProfileJSON_IncludesExplicitNullLocale(t *testing.T) {
	t.Parallel()

	body, err := json.Marshal(Profile{Country: "co"})
	if err != nil {
		t.Fatalf("marshal profile: %v", err)
	}
	if !strings.Contains(string(body), `"locale":null`) {
		t.Errorf("json = %s, want explicit locale null", body)
	}
}

func TestUpdateProfileRequest_IsLocaleOnly(t *testing.T) {
	t.Parallel()

	locale := "es"
	cases := []struct {
		name string
		req  UpdateProfileRequest
		want bool
	}{
		{name: "locale only", req: UpdateProfileRequest{Locale: &locale}, want: true},
		{name: "empty", req: UpdateProfileRequest{}, want: true},
		{name: "country only", req: UpdateProfileRequest{Country: "co"}, want: false},
		{name: "broker only", req: UpdateProfileRequest{BrokerPresetID: "hapi-colombia"}, want: false},
		{name: "country and broker", req: UpdateProfileRequest{Country: "co", BrokerPresetID: "hapi-colombia", Locale: &locale}, want: false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			if got := tc.req.IsLocaleOnly(); got != tc.want {
				t.Errorf("IsLocaleOnly() = %v, want %v", got, tc.want)
			}
		})
	}
}
