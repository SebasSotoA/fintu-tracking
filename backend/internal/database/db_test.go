package database

import (
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestApplyPoolEnvSettings_defaultsWhenUnset(t *testing.T) {
	t.Setenv("DB_MAX_OPEN_CONNS", "")
	t.Setenv("DB_MAX_IDLE_CONNS", "")

	cfg := &pgxpool.Config{}
	applyPoolEnvSettings(cfg)

	if cfg.MaxConns != defaultMaxOpenConns {
		t.Fatalf("MaxConns = %d, want %d", cfg.MaxConns, defaultMaxOpenConns)
	}
	if cfg.MinConns != defaultMaxIdleConns {
		t.Fatalf("MinConns = %d, want %d", cfg.MinConns, defaultMaxIdleConns)
	}
}

func TestApplyPoolEnvSettings_readsEnvValues(t *testing.T) {
	t.Setenv("DB_MAX_OPEN_CONNS", "5")
	t.Setenv("DB_MAX_IDLE_CONNS", "2")

	cfg := &pgxpool.Config{}
	applyPoolEnvSettings(cfg)

	if cfg.MaxConns != 5 {
		t.Fatalf("MaxConns = %d, want 5", cfg.MaxConns)
	}
	if cfg.MinConns != 2 {
		t.Fatalf("MinConns = %d, want 2", cfg.MinConns)
	}
}

func TestApplyPoolEnvSettings_invalidEnvFallsBackToDefaults(t *testing.T) {
	t.Setenv("DB_MAX_OPEN_CONNS", "not-a-number")
	t.Setenv("DB_MAX_IDLE_CONNS", "0")

	cfg := &pgxpool.Config{}
	applyPoolEnvSettings(cfg)

	if cfg.MaxConns != defaultMaxOpenConns {
		t.Fatalf("MaxConns = %d, want %d", cfg.MaxConns, defaultMaxOpenConns)
	}
	if cfg.MinConns != defaultMaxIdleConns {
		t.Fatalf("MinConns = %d, want %d", cfg.MinConns, defaultMaxIdleConns)
	}
}
