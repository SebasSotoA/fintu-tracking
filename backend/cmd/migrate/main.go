package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"

	"fintu-tracking-backend/internal/database"
	"fintu-tracking-backend/internal/migrations"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	if len(os.Args) < 2 {
		usage()
		os.Exit(1)
	}

	cmd := os.Args[1]
	dir := migrationsDir()

	switch cmd {
	case "up":
		if err := runMigrate(dir, func(db *sql.DB) error { return migrations.Up(db, dir) }); err != nil {
			log.Fatalf("migrate up failed: %v", err)
		}
		fmt.Println("migrations applied successfully")
	case "down":
		steps := 1
		if len(os.Args) > 2 {
			n, err := strconv.Atoi(os.Args[2])
			if err != nil {
				log.Fatalf("invalid step count: %v", err)
			}
			steps = n
		}
		if err := runMigrate(dir, func(db *sql.DB) error { return migrations.Down(db, dir, steps) }); err != nil {
			log.Fatalf("migrate down failed: %v", err)
		}
		fmt.Printf("rolled back %d step(s)\n", steps)
	case "status":
		if err := runMigrate(dir, func(db *sql.DB) error {
			version, dirty, err := migrations.Status(db, dir)
			if err != nil {
				return err
			}
			fmt.Printf("version: %d dirty: %v\n", version, dirty)
			return nil
		}); err != nil {
			log.Fatalf("migrate status failed: %v", err)
		}
	case "create":
		if len(os.Args) < 3 {
			log.Fatalf("usage: migrate create <name>")
		}
		if err := migrations.Create(dir, os.Args[2]); err != nil {
			log.Fatalf("migrate create failed: %v", err)
		}
		fmt.Println("migration files created")
	default:
		usage()
		os.Exit(1)
	}
}

func usage() {
	fmt.Println("usage: migrate <up|down [steps]|status|create name>")
}

func migrationsDir() string {
	cwd, _ := os.Getwd()
	base := filepath.Base(cwd)
	switch base {
	case "backend":
		return "migrations"
	case "fintu-tracking":
		return "backend/migrations"
	default:
		return "migrations"
	}
}

func runMigrate(dir string, fn func(*sql.DB) error) error {
	db, err := database.OpenMigrationDB()
	if err != nil {
		return err
	}
	defer db.Close()
	return fn(db)
}
