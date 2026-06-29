# Database migrations via golang-migrate

MIGRATIONS_DIR := $(BACKEND_DIR)/migrations

.PHONY: migrate migrate-status migrate-down migrate-create

migrate: check-env
	@echo "Applying migrations..."
	@cd $(BACKEND_DIR) && go run ./cmd/migrate up

migrate-status: check-env
	@cd $(BACKEND_DIR) && go run ./cmd/migrate status

migrate-down: check-env
	@echo "Rolling back one migration..."
	@cd $(BACKEND_DIR) && go run ./cmd/migrate down 1

migrate-create:
	@if [ -z "$(NAME)" ]; then \
		echo "Usage: make migrate-create NAME=add_profiles_table"; \
		exit 1; \
	fi
	@cd $(BACKEND_DIR) && go run ./cmd/migrate create $(NAME)
