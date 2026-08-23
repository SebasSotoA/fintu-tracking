# =============================================================================
# Marketing (Astro) — dev, build, test, clean
# =============================================================================

.PHONY: marketing-dev marketing-build marketing-test marketing-check marketing-clean deps-marketing

marketing-dev:
	@echo "Starting marketing dev server on :$(MARKETING_PORT)..."
	@cd $(MARKETING_DIR) && $(NPM) dev

marketing-build:
	@echo "Building marketing site..."
	@cd $(MARKETING_DIR) && $(NPM) build
	@echo "Marketing build complete: $(MARKETING_DIR)/dist/"

marketing-test:
	@echo "Running marketing tests..."
	@cd $(MARKETING_DIR) && $(NPM) test
	@echo "Marketing tests passed"

marketing-check:
	@echo "Running marketing type check..."
	@cd $(MARKETING_DIR) && $(NPM) exec astro check
	@echo "Marketing check passed"

marketing-clean:
	@echo "Cleaning marketing build artifacts..."
	@cd $(MARKETING_DIR) && rm -rf dist .astro
	@echo "Marketing cleaned"

deps-marketing:
	@echo "Installing marketing dependencies..."
	@cd $(MARKETING_DIR) && $(NPM) install
	@echo "Marketing dependencies installed"