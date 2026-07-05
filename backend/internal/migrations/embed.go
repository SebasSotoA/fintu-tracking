package migrations

import (
	"database/sql"
	"fmt"
	"net/url"
	"os"
	"path/filepath"

	migrationassets "fintu-tracking-backend/migrations"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/pgx/v5"
	"github.com/golang-migrate/migrate/v4/source"
	migrateiofs "github.com/golang-migrate/migrate/v4/source/iofs"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func useEmbeddedMigrations() bool {
	if os.Getenv("MIGRATIONS_SOURCE") == "embed" {
		return true
	}
	return os.Getenv("AWS_LAMBDA_RUNTIME_API") != ""
}

func openMigrationSource(dir string) (source.Driver, error) {
	if useEmbeddedMigrations() {
		return migrateiofs.New(migrationassets.FS, ".")
	}

	absDir, err := filepath.Abs(dir)
	if err != nil {
		return nil, fmt.Errorf("resolve migrations path: %w", err)
	}

	srcURL := (&url.URL{Scheme: "file", Path: filepath.ToSlash(absDir)}).String()
	return source.Open(srcURL)
}

func newMigrator(dir string, db *sql.DB) (*migrate.Migrate, error) {
	src, err := openMigrationSource(dir)
	if err != nil {
		return nil, fmt.Errorf("open migration source: %w", err)
	}

	dbDriver, err := pgx.WithInstance(db, &pgx.Config{})
	if err != nil {
		src.Close()
		return nil, fmt.Errorf("create pgx migration driver: %w", err)
	}

	sourceName := "file"
	if useEmbeddedMigrations() {
		sourceName = "iofs"
	}

	m, err := migrate.NewWithInstance(sourceName, src, "pgx5", dbDriver)
	if err != nil {
		src.Close()
		return nil, fmt.Errorf("create migrator: %w", err)
	}

	return m, nil
}
