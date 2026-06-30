# Database migrations via golang-migrate

MIGRATIONS_DIR := $(BACKEND_DIR)/migrations
MIGRATE_BIN := $(BACKEND_DIR)/bin/migrate

.PHONY: migrate migrate-status migrate-down migrate-create

$(MIGRATE_BIN):
	@mkdir -p $(BACKEND_DIR)/bin
	cd $(BACKEND_DIR) && go build -o bin/migrate ./cmd/migrate

migrate: check-env $(MIGRATE_BIN)
	@echo "Applying migrations..."
	@cd $(BACKEND_DIR) && ./bin/migrate up

migrate-status: check-env $(MIGRATE_BIN)
	@cd $(BACKEND_DIR) && ./bin/migrate status

migrate-down: check-env $(MIGRATE_BIN)
	@echo "Rolling back one migration..."
	@cd $(BACKEND_DIR) && ./bin/migrate down 1

migrate-create: $(MIGRATE_BIN)
	@if [ -z "$(NAME)" ]; then \
		echo "Usage: make migrate-create NAME=add_profiles_table"; \
		exit 1; \
	fi
	@cd $(BACKEND_DIR) && ./bin/migrate create $(NAME)
