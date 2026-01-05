# Fintu Tracking Backend (Go)

This is the Go REST API backend for Fintu Tracking.

## Setup

1. Install Go 1.22 or higher
2. Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```
3. Install dependencies:
   ```bash
   go mod download
   ```
4. Run the server:
   ```bash
   go run cmd/api/main.go
   ```

## Development

For hot reload during development, install and use Air:

```bash
go install github.com/cosmtrek/air@latest
air
```

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string (Supabase)
- `SUPABASE_JWT_SECRET`: JWT secret from Supabase project settings
- `PORT`: Port to run the server on (default: 8080)
- `FRONTEND_URL`: Frontend URL for CORS (default: http://localhost:3000)

## API Endpoints

See the main README.md for full API documentation.

## Building for Production

```bash
go build -o main cmd/api/main.go
./main
```
