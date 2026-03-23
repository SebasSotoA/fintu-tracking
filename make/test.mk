# =============================================================================
# Testing
# =============================================================================

test:
	@echo "Running tests..."
	@cd $(BACKEND_DIR) && $(GOTEST) -race ./...
	@echo "Tests passed"

test-verbose:
	@echo "Running tests (verbose)..."
	@cd $(BACKEND_DIR) && $(GOTEST) -race -v ./...

test-coverage:
	@echo "Running tests with coverage..."
	@mkdir -p $(COVERAGE_DIR)
	@cd $(BACKEND_DIR) && $(GOTEST) -race -coverprofile=../$(COVERAGE_DIR)/coverage.out ./...
	@cd $(BACKEND_DIR) && go tool cover -html=../$(COVERAGE_DIR)/coverage.out -o ../$(COVERAGE_DIR)/coverage.html
	@echo "Coverage report: $(COVERAGE_DIR)/coverage.html"

test-coverage-view: test-coverage
	@echo "Opening coverage report..."
	@if [ "$$(uname -s 2>/dev/null || echo Windows)" = "Windows_NT" ] || echo "$${OS:-unknown}" | grep -qi windows; then \
		start $(COVERAGE_DIR)/coverage.html 2>/dev/null || echo "Coverage report available at: $(COVERAGE_DIR)/coverage.html"; \
	elif command -v open >/dev/null 2>&1; then \
		open $(COVERAGE_DIR)/coverage.html; \
	elif command -v xdg-open >/dev/null 2>&1; then \
		xdg-open $(COVERAGE_DIR)/coverage.html; \
	else \
		echo "Coverage report available at: $(COVERAGE_DIR)/coverage.html"; \
	fi

test-short:
	@echo "Running short tests..."
	@cd $(BACKEND_DIR) && $(GOTEST) -short ./...
	@echo "Short tests passed"

test-unit:
	@echo "Running unit tests..."
	@cd $(BACKEND_DIR) && $(GOTEST) -race -v ./internal/...
	@echo "Unit tests passed"

test-api:
	@echo "Running API tests..."
	@cd $(BACKEND_DIR) && $(GOTEST) -race -v ./cmd/... ./handlers/...
	@echo "API tests passed"
