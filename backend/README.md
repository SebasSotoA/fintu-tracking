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
4. Run migrations:
   ```bash
   make migrate
   ```
   (Migrations live in `backend/migrations/` and are applied automatically when
   the backend starts, but running `make migrate` explicitly is useful for
   CI/production.)
5. Run the server:
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
- `SUPABASE_URL`: Supabase project URL (required for ES256 JWT validation via JWKS)
- `SUPABASE_JWT_SECRET`: JWT secret from Supabase project settings (required for HS256 JWT validation)
- `PORT`: Port to run the server on (default: 8080)
- `FRONTEND_URL`: Frontend URL for CORS (default: http://localhost:3000)
- `TWELVE_DATA_API_KEY`: API key from [Twelve Data](https://twelvedata.com/) used to refresh stock/ETF market prices (`/quote`) and fetch the USD/COP exchange rate (`/exchange_rate`)

## API Endpoints

See the main README.md for full API documentation.

## Database Migrations

Migrations are managed with [`golang-migrate`](https://github.com/golang-migrate/migrate):

- Apply migrations: `make migrate`
- Check status: `make migrate-status`
- Roll back one migration: `make migrate-down`
- Create a new migration: `make migrate-create NAME=add_notifications_table`

Historical SQL scripts are kept in `scripts/archive/` for audit history only.

## Building for Production

```bash
go build -o main cmd/api/main.go
./main
```
