// Package migrations provides a thin wrapper around golang-migrate/migrate/v4
// for versioned PostgreSQL schema changes.
package migrations

import (
	"database/sql"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/pgx/v5"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

// newMigrator builds a golang-migrate instance from a filesystem migration
// directory and an open *sql.DB.
func newMigrator(dir string, db *sql.DB) (*migrate.Migrate, error) {
	absDir, err := filepath.Abs(dir)
	if err != nil {
		return nil, fmt.Errorf("resolve migrations path: %w", err)
	}

	srcURL := (&url.URL{Scheme: "file", Path: filepath.ToSlash(absDir)}).String()

	dbDriver, err := pgx.WithInstance(db, &pgx.Config{})
	if err != nil {
		return nil, fmt.Errorf("create pgx migration driver: %w", err)
	}

	m, err := migrate.NewWithDatabaseInstance(srcURL, "pgx5", dbDriver)
	if err != nil {
		return nil, fmt.Errorf("create migrator: %w", err)
	}

	return m, nil
}

// withMigrator creates a migrator for dir and db, runs fn, and ensures it is closed.
func withMigrator(dir string, db *sql.DB, fn func(*migrate.Migrate) error) error {
	m, err := newMigrator(dir, db)
	if err != nil {
		return err
	}
	defer m.Close()
	return fn(m)
}

// Up applies all pending migrations.
func Up(db *sql.DB, dir string) error {
	return withMigrator(dir, db, func(m *migrate.Migrate) error {
		err := m.Up()
		if err != nil && err != migrate.ErrNoChange {
			return fmt.Errorf("apply migrations: %w", err)
		}
		return nil
	})
}

// Down rolls back migrations. If steps > 0 it rolls back that many versions;
// otherwise it rolls back all applied migrations.
func Down(db *sql.DB, dir string, steps int) error {
	return withMigrator(dir, db, func(m *migrate.Migrate) error {
		var err error
		if steps > 0 {
			err = m.Steps(-steps)
		} else {
			err = m.Down()
		}
		if err != nil && err != migrate.ErrNoChange {
			return fmt.Errorf("rollback migrations: %w", err)
		}
		return nil
	})
}

// Status returns the current migration version and dirty flag.
// When no migrations have been applied, version is 0 and dirty is false.
func Status(db *sql.DB, dir string) (version uint, dirty bool, err error) {
	err = withMigrator(dir, db, func(m *migrate.Migrate) error {
		version, dirty, err = m.Version()
		return err
	})
	if err == migrate.ErrNilVersion {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, fmt.Errorf("query migration status: %w", err)
	}
	return version, dirty, nil
}

// Create writes a new paired migration file in dir using the next sequential
// version number (e.g. 000002_add_table.up.sql and .down.sql).
func Create(dir, name string) error {
	if name == "" {
		return fmt.Errorf("migration name is required")
	}
	clean := strings.TrimSpace(strings.ToLower(name))
	clean = strings.ReplaceAll(clean, " ", "_")
	if clean == "" {
		return fmt.Errorf("migration name is invalid")
	}

	next, err := nextVersion(dir)
	if err != nil {
		return fmt.Errorf("determine next migration version: %w", err)
	}

	prefix := fmt.Sprintf("%06d_%s", next, clean)
	stub := fmt.Sprintf("-- Migration: %s\n-- Add your %%s migration here\n", clean)
	files := []struct {
		suffix string
		label  string
	}{
		{"up", "up"},
		{"down", "down"},
	}
	for _, f := range files {
		path := filepath.Join(dir, fmt.Sprintf("%s.%s.sql", prefix, f.suffix))
		content := fmt.Sprintf(stub, f.label)
		if err := os.WriteFile(path, []byte(content), 0644); err != nil {
			return fmt.Errorf("write %s: %w", path, err)
		}
	}

	return nil
}

// nextVersion scans dir for existing *.up.sql migrations and returns the
// next unused version number. The first migration is version 1.
func nextVersion(dir string) (int, error) {
	max := 0
	entries, err := os.ReadDir(dir)
	if err != nil {
		return 0, err
	}
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		if !strings.HasSuffix(name, ".up.sql") {
			continue
		}
		parts := strings.SplitN(name, "_", 2)
		if len(parts) < 2 {
			continue
		}
		n, err := strconv.Atoi(parts[0])
		if err != nil {
			continue
		}
		if n > max {
			max = n
		}
	}
	return max + 1, nil
}
