// Package migrations provides a thin wrapper around golang-migrate/migrate/v4
// for versioned PostgreSQL schema changes.
package migrations

import (
	"database/sql"
	"fmt"
	"io/fs"
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

// Up applies all pending migrations.
func Up(db *sql.DB, dir string) error {
	m, err := newMigrator(dir, db)
	if err != nil {
		return err
	}
	defer m.Close()

	err = m.Up()
	if err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("apply migrations: %w", err)
	}
	return nil
}

// Down rolls back migrations. If steps > 0 it rolls back that many versions;
// otherwise it rolls back all applied migrations.
func Down(db *sql.DB, dir string, steps int) error {
	m, err := newMigrator(dir, db)
	if err != nil {
		return err
	}
	defer m.Close()

	if steps > 0 {
		err = m.Steps(-steps)
	} else {
		err = m.Down()
	}
	if err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("rollback migrations: %w", err)
	}
	return nil
}

// Status returns the current migration version and dirty flag.
// When no migrations have been applied, version is 0 and dirty is false.
func Status(db *sql.DB, dir string) (version uint, dirty bool, err error) {
	m, err := newMigrator(dir, db)
	if err != nil {
		return 0, false, err
	}
	defer m.Close()

	version, dirty, err = m.Version()
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
	upPath := filepath.Join(dir, prefix+".up.sql")
	downPath := filepath.Join(dir, prefix+".down.sql")

	upStub := fmt.Sprintf("-- Migration: %s\n-- Add your up migration here\n", clean)
	downStub := fmt.Sprintf("-- Migration: %s\n-- Add your down migration here\n", clean)

	if err := os.WriteFile(upPath, []byte(upStub), 0644); err != nil {
		return fmt.Errorf("write %s: %w", upPath, err)
	}
	if err := os.WriteFile(downPath, []byte(downStub), 0644); err != nil {
		return fmt.Errorf("write %s: %w", downPath, err)
	}

	return nil
}

// nextVersion scans dir for existing *.up.sql migrations and returns the
// next unused version number. The first migration is version 1.
func nextVersion(dir string) (int, error) {
	max := 0
	err := filepath.WalkDir(dir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		name := d.Name()
		if !strings.HasSuffix(name, ".up.sql") {
			return nil
		}
		parts := strings.SplitN(name, "_", 2)
		if len(parts) < 2 {
			return nil
		}
		n, err := strconv.Atoi(parts[0])
		if err != nil {
			return nil
		}
		if n > max {
			max = n
		}
		return nil
	})
	if err != nil {
		return 0, err
	}
	return max + 1, nil
}
