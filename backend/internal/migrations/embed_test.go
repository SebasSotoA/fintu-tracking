package migrations

import (
	"path/filepath"
	"testing"

	migrationassets "fintu-tracking-backend/migrations"
)

func TestUseEmbeddedMigrations_envSourceEmbed(t *testing.T) {
	t.Setenv("MIGRATIONS_SOURCE", "embed")
	t.Setenv("AWS_LAMBDA_RUNTIME_API", "")

	if !useEmbeddedMigrations() {
		t.Fatal("expected embedded migrations when MIGRATIONS_SOURCE=embed")
	}
}

func TestUseEmbeddedMigrations_lambdaRuntime(t *testing.T) {
	t.Setenv("MIGRATIONS_SOURCE", "")
	t.Setenv("AWS_LAMBDA_RUNTIME_API", "arn:aws:lambda:us-east-1:123:function:test")

	if !useEmbeddedMigrations() {
		t.Fatal("expected embedded migrations when AWS_LAMBDA_RUNTIME_API is set")
	}
}

func TestUseEmbeddedMigrations_defaultFilesystem(t *testing.T) {
	t.Setenv("MIGRATIONS_SOURCE", "")
	t.Setenv("AWS_LAMBDA_RUNTIME_API", "")

	if useEmbeddedMigrations() {
		t.Fatal("expected filesystem migrations by default")
	}
}

func TestEmbeddedMigrationsContainSQLFiles(t *testing.T) {
	t.Parallel()

	entries, err := migrationassets.FS.ReadDir(".")
	if err != nil {
		t.Fatalf("read embedded migrations: %v", err)
	}

	if len(entries) == 0 {
		t.Fatal("expected embedded SQL migration files")
	}

	foundSQL := false
	for _, entry := range entries {
		if filepath.Ext(entry.Name()) == ".sql" {
			foundSQL = true
			break
		}
	}
	if !foundSQL {
		t.Fatal("expected at least one .sql file in embedded migrations")
	}
}

func TestOpenMigrationSource_embedIgnoresDir(t *testing.T) {
	t.Setenv("MIGRATIONS_SOURCE", "embed")
	t.Setenv("AWS_LAMBDA_RUNTIME_API", "")

	src, err := openMigrationSource("/nonexistent/migrations")
	if err != nil {
		t.Fatalf("openMigrationSource: %v", err)
	}
	defer src.Close()

	version, err := src.First()
	if err != nil {
		t.Fatalf("First: %v", err)
	}
	if version == 0 {
		t.Fatal("expected first migration version from embed source")
	}
}
