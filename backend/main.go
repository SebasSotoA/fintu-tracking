package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"fintu-tracking-backend/internal/server"

	"github.com/joho/godotenv"
)

func main() {
	ctx := context.Background()

	if len(os.Args) > 1 && os.Args[1] == "dev" {
		startDev(ctx)
		return
	}

	deps, err := server.Bootstrap(ctx)
	if err != nil {
		log.Fatalf("Failed to bootstrap server: %v", err)
	}
	defer deps.Close()

	LambdaStart(deps)
}

func startDev(ctx context.Context) {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	deps, err := server.Bootstrap(ctx)
	if err != nil {
		log.Fatalf("Failed to bootstrap server: %v", err)
	}
	defer deps.Close()

	if err := server.RunMigrations(); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	app := server.NewApp(deps)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("Server starting on port %s\n", port)
	log.Fatal(app.Listen(":" + port))
}
