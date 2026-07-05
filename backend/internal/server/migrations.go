package server

import (
	"fmt"
	"os"
	"path/filepath"

	"fintu-tracking-backend/internal/database"
	"fintu-tracking-backend/internal/migrations"
)

// ResolveMigrationsDir returns the migrations directory relative to the current working directory.
func ResolveMigrationsDir() string {
	cwd, err := os.Getwd()
	if err != nil {
		return "migrations"
	}
	if filepath.Base(cwd) == "fintu-tracking" {
		return "backend/migrations"
	}
	return "migrations"
}

// RunMigrations opens a dedicated migration database connection, applies all
// pending migrations, and closes the connection.
func RunMigrations() error {
	migrationDB, err := database.OpenMigrationDB()
	if err != nil {
		return fmt.Errorf("open migration db: %w", err)
	}
	defer migrationDB.Close()

	if err := migrations.Up(migrationDB, ResolveMigrationsDir()); err != nil {
		return fmt.Errorf("apply migrations: %w", err)
	}
	return nil
}
