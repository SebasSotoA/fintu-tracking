package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

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

	srv := &http.Server{Addr: ":" + port, Handler: app}

	go func() {
		log.Printf("Backend listening on :%s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down backend...")

	shutdownCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("Server shutdown error: %v", err)
	}
	log.Println("Backend stopped")
}
