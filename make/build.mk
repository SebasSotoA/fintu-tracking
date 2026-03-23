# =============================================================================
# Build & Code Quality
# =============================================================================

build:
	@echo "Building $(APP_NAME)..."
	@mkdir -p $(BIN_DIR)
	@cd $(BACKEND_DIR) && $(GOBUILD) -o ../$(BIN_DIR)/$(APP_NAME) $(BUILD_FLAGS) ./cmd/api
	@echo "Binary: $(BIN_DIR)/$(APP_NAME)"

build-frontend:
	@echo "Building frontend..."
	@cd $(FRONTEND_DIR) && $(NPM) run build
	@echo "Frontend build complete"

build-all: build build-frontend

# =============================================================================
# Code Quality
# =============================================================================

fmt:
	@echo "Formatting code..."
	@cd $(BACKEND_DIR) && $(GOFMT) -s -w .
	@echo "Code formatted"

vet:
	@echo "Running go vet..."
	@cd $(BACKEND_DIR) && $(GOVET) ./...
	@echo "Vet passed"

lint:
	@echo "Running linter..."
	@if command -v golangci-lint >/dev/null 2>&1; then \
		cd $(BACKEND_DIR) && golangci-lint run ./...; \
		echo "Lint passed"; \
	else \
		echo "golangci-lint not installed"; \
		echo "  Install: go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest"; \
		$(MAKE) vet; \
	fi

lint-frontend:
	@echo "Running frontend linter..."
	@cd $(FRONTEND_DIR) && $(NPM) run lint
	@echo "Frontend lint passed"

check: fmt vet lint

check-all: check lint-frontend

# =============================================================================
# Cleanup
# =============================================================================

clean:
	@echo "Cleaning build artifacts..."
	@rm -rf $(BIN_DIR) $(COVERAGE_DIR)
	@cd $(BACKEND_DIR) && $(GOCLEAN) -cache -testcache
	@cd $(FRONTEND_DIR) && rm -rf .next dist node_modules/.cache
	@echo "Clean complete"

clean-frontend:
	@echo "Cleaning frontend build artifacts..."
	@cd $(FRONTEND_DIR) && rm -rf .next dist
	@echo "Frontend cleaned"
