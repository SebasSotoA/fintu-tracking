package handlers

import (
	"context"
	"errors"
	"testing"

	"fintu-tracking-backend/internal/models"
)

// mockBrokerResolver is a test double for the brokerResolver interface.
type mockBrokerResolver struct {
	getByID     func(ctx context.Context, userID, brokerID string) (*models.Broker, error)
	getOrCreate func(ctx context.Context, userID, presetID string) (*models.Broker, error)
}

func (m *mockBrokerResolver) GetBrokerByID(ctx context.Context, userID, brokerID string) (*models.Broker, error) {
	return m.getByID(ctx, userID, brokerID)
}

func (m *mockBrokerResolver) GetOrCreateBrokerFromPreset(ctx context.Context, userID, presetID string) (*models.Broker, error) {
	return m.getOrCreate(ctx, userID, presetID)
}

func ptrStr(s string) *string { return &s }

func TestResolveBrokerID(t *testing.T) {
	t.Parallel()

	const userID = "user-1"
	const ownedUUID = "11111111-1111-1111-1111-111111111111"
	const presetSlug = "hapi-colombia"
	const presetBrokerUUID = "22222222-2222-2222-2222-222222222222"

	mustNotCall := func(name string) func(context.Context, string, string) (*models.Broker, error) {
		return func(_ context.Context, _, _ string) (*models.Broker, error) {
			panic("must not call " + name)
		}
	}

	cases := []struct {
		name        string
		brokerID    *string
		getByID     func(ctx context.Context, userID, id string) (*models.Broker, error)
		getOrCreate func(ctx context.Context, userID, presetID string) (*models.Broker, error)
		wantID      *string
		wantErr     string
	}{
		{
			name:        "nil broker_id returns nil without calling resolver",
			brokerID:    nil,
			getByID:     mustNotCall("GetBrokerByID"),
			getOrCreate: mustNotCall("GetOrCreateBrokerFromPreset"),
			wantID:      nil,
		},
		{
			name:        "empty broker_id returns nil without calling resolver",
			brokerID:    ptrStr(""),
			getByID:     mustNotCall("GetBrokerByID"),
			getOrCreate: mustNotCall("GetOrCreateBrokerFromPreset"),
			wantID:      nil,
		},
		{
			name:     "UUID matching owned broker returns that UUID without calling GetOrCreate",
			brokerID: ptrStr(ownedUUID),
			getByID: func(_ context.Context, uID, bID string) (*models.Broker, error) {
				if uID == userID && bID == ownedUUID {
					return &models.Broker{ID: ownedUUID}, nil
				}
				return nil, nil
			},
			getOrCreate: mustNotCall("GetOrCreateBrokerFromPreset"),
			wantID:      ptrStr(ownedUUID),
		},
		{
			name:     "UUID not found in DB falls through to preset lookup",
			brokerID: ptrStr(ownedUUID),
			getByID: func(_ context.Context, _, _ string) (*models.Broker, error) {
				return nil, nil // broker row was deleted
			},
			getOrCreate: func(_ context.Context, _, _ string) (*models.Broker, error) {
				return &models.Broker{ID: presetBrokerUUID}, nil
			},
			wantID: ptrStr(presetBrokerUUID),
		},
		{
			name:        "preset slug skips GetBrokerByID and calls GetOrCreate directly",
			brokerID:    ptrStr(presetSlug),
			getByID:     mustNotCall("GetBrokerByID"),
			getOrCreate: func(_ context.Context, uID, pID string) (*models.Broker, error) {
				if uID == userID && pID == presetSlug {
					return &models.Broker{ID: presetBrokerUUID}, nil
				}
				return nil, errors.New("unexpected args")
			},
			wantID: ptrStr(presetBrokerUUID),
		},
		{
			// Regression guard: the old code called GetBrokerByID unconditionally,
			// which caused Postgres to return "invalid input syntax for type uuid"
			// for any preset slug, blocking the GetOrCreate fallback entirely.
			name:        "preset slug never reaches GetBrokerByID even when getByID would error",
			brokerID:    ptrStr(presetSlug),
			getByID:     mustNotCall("GetBrokerByID"),
			getOrCreate: func(_ context.Context, uID, pID string) (*models.Broker, error) {
				return &models.Broker{ID: presetBrokerUUID}, nil
			},
			wantID: ptrStr(presetBrokerUUID),
		},
		{
			name:        "unknown value returns invalid broker_id error without calling GetBrokerByID",
			brokerID:    ptrStr("not-a-uuid-or-known-preset"),
			getByID:     mustNotCall("GetBrokerByID"),
			getOrCreate: func(_ context.Context, _, _ string) (*models.Broker, error) {
				return nil, errors.New(`unknown broker preset "not-a-uuid-or-known-preset"`)
			},
			wantID:  nil,
			wantErr: "invalid broker_id",
		},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			mock := &mockBrokerResolver{
				getByID:     tc.getByID,
				getOrCreate: tc.getOrCreate,
			}

			gotID, err := resolveBrokerID(context.Background(), mock, userID, tc.brokerID)

			if tc.wantErr != "" {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				if err.Error() != tc.wantErr {
					t.Errorf("error = %q, want %q", err.Error(), tc.wantErr)
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if tc.wantID == nil {
				if gotID != nil {
					t.Errorf("got %q, want nil", *gotID)
				}
				return
			}

			if gotID == nil {
				t.Fatalf("got nil, want %q", *tc.wantID)
			}
			if *gotID != *tc.wantID {
				t.Errorf("got %q, want %q", *gotID, *tc.wantID)
			}
		})
	}
}
