# =============================================================================
# Development Workflow
# =============================================================================

.PHONY: check-env backend-dev frontend-dev dev stop stop-backend stop-frontend restart restart-backend restart-frontend setup install deps deps-frontend deps-all

# Verify backend/.env exists
check-env:
	@if [ ! -f $(BACKEND_DIR)/.env ]; then \
		echo "$(BACKEND_DIR)/.env not found"; \
		echo "  Copy: cp $(BACKEND_DIR)/.env.example $(BACKEND_DIR)/.env"; \
		echo "  Then update it with your Supabase credentials"; \
		exit 1; \
	fi
	@echo "Environment configuration OK"

# Development servers in foreground (for debugging)
backend-dev:
	@echo "Checking port availability..."
	@$(MAKE) check-port-available PORT=$(BACKEND_PORT)
	@echo "Starting backend server (foreground) on :$(BACKEND_PORT)..."
	@if command -v air > /dev/null 2>&1; then \
		cd $(BACKEND_DIR) && air; \
	else \
		echo "air not found, using go run ./cmd/api..."; \
		cd $(BACKEND_DIR) && go run ./cmd/api; \
	fi

frontend-dev:
	@echo "Checking port availability..."
	@$(MAKE) check-port-available PORT=$(FRONTEND_PORT)
	@echo "Starting frontend server (foreground) on :$(FRONTEND_PORT)..."
	@cd $(FRONTEND_DIR) && $(NPM) run dev

# Combined dev environment - starts both servers in background
dev: install check-env ensure-ports-free
	@echo "Starting development environment..."
	@echo "  Backend:  http://localhost:$(BACKEND_PORT)"
	@echo "  Frontend: http://localhost:$(FRONTEND_PORT)"
	@echo ""
	@if [ ! -f $(BACKEND_DIR)/.env ]; then \
		echo "WARNING: $(BACKEND_DIR)/.env not found"; \
		echo "   Create it: cp $(BACKEND_DIR)/.env.example $(BACKEND_DIR)/.env"; \
		echo ""; \
	fi
	@bash -c ' \
		SCRIPT_DIR="$$(pwd)"; \
		echo "Starting backend server..."; \
		if command -v air > /dev/null 2>&1; then \
			(cd $$SCRIPT_DIR/$(BACKEND_DIR) && air) > /tmp/fintu-backend.log 2>&1 & \
		else \
			echo "   air not found, using go run ./cmd/api..."; \
			(cd $$SCRIPT_DIR/$(BACKEND_DIR) && go run ./cmd/api) > /tmp/fintu-backend.log 2>&1 & \
		fi; \
		BACKEND_PID=$$!; \
		echo "   Backend PID: $$BACKEND_PID"; \
		echo "   Backend logs: tail -f /tmp/fintu-backend.log"; \
		echo ""; \
		echo "Starting frontend server..."; \
		(cd $$SCRIPT_DIR/$(FRONTEND_DIR) && $(NPM) run dev) > /tmp/fintu-frontend.log 2>&1 & \
		FRONTEND_PID=$$!; \
		echo "   Frontend PID: $$FRONTEND_PID"; \
		echo "   Frontend logs: tail -f /tmp/fintu-frontend.log"; \
		echo ""; \
		sleep 8; \
		BACKEND_UP=false; \
		FRONTEND_UP=false; \
		if netstat -ano 2>/dev/null | grep -qi ":$(BACKEND_PORT).*LISTENING" || lsof -i:$(BACKEND_PORT) > /dev/null 2>&1; then BACKEND_UP=true; fi; \
		if netstat -ano 2>/dev/null | grep -qi ":$(FRONTEND_PORT).*LISTENING" || lsof -i:$(FRONTEND_PORT) > /dev/null 2>&1; then FRONTEND_UP=true; fi; \
		if [ "$$BACKEND_UP" = true ] && [ "$$FRONTEND_UP" = true ]; then \
			echo "Development servers started successfully"; \
		elif [ "$$BACKEND_UP" = false ] && [ "$$FRONTEND_UP" = false ]; then \
			echo "Warning: Both servers failed to start"; \
			echo "   Check logs: tail -f /tmp/fintu-backend.log /tmp/fintu-frontend.log"; \
		elif [ "$$BACKEND_UP" = false ]; then \
			echo "Warning: Backend failed to start"; \
			echo "   Check logs: tail -f /tmp/fintu-backend.log"; \
		else \
			echo "Warning: Frontend failed to start"; \
			echo "   Check logs: tail -f /tmp/fintu-frontend.log"; \
		fi; \
		echo ""; \
		echo "Useful commands:"; \
		echo "   View backend logs:  tail -f /tmp/fintu-backend.log"; \
		echo "   View frontend logs: tail -f /tmp/fintu-frontend.log"; \
		echo "   Stop servers:       make stop"; \
		echo "   Health check:       make health-check"; \
		echo "" \
	'

# Stop targets
stop-backend:
	@echo "Stopping backend server..."
	@if [ "$$(uname -s 2>/dev/null || echo Windows)" = "Windows_NT" ] || echo "$${OS:-unknown}" | grep -qi windows; then \
		PIDS=$$(netstat -ano | grep ':$(BACKEND_PORT) ' | awk '{print $$5}' | sort -u | grep -v '^0$$' || true); \
		if [ -n "$$PIDS" ]; then \
			echo "  Found processes on port $(BACKEND_PORT): $$PIDS"; \
			for pid in $$PIDS; do \
				echo "    Killing PID $$pid..."; \
				taskkill //F //PID $$pid 2>/dev/null || true; \
			done; \
			sleep 1; \
			echo "Backend stopped"; \
		else \
			echo "No process found on port $(BACKEND_PORT)"; \
		fi; \
	else \
		PIDS=$$(lsof -ti:$(BACKEND_PORT) 2>/dev/null); \
		if [ -n "$$PIDS" ]; then \
			echo "  Found processes on port $(BACKEND_PORT): $$PIDS"; \
			for pid in $$PIDS; do \
				pkill -9 -P $$pid 2>/dev/null || true; \
				kill -9 $$pid 2>/dev/null || true; \
			done; \
			sleep 1; \
			echo "Backend stopped"; \
		else \
			echo "No process found on port $(BACKEND_PORT)"; \
			AIR_PIDS=$$(pgrep -f "air" 2>/dev/null || true); \
			if [ -n "$$AIR_PIDS" ]; then \
				echo $$AIR_PIDS | xargs kill -9 2>/dev/null || true; \
				echo "Backend stopped"; \
			fi; \
		fi; \
	fi

stop-frontend:
	@echo "Stopping frontend server..."
	@if [ "$$(uname -s 2>/dev/null || echo Windows)" = "Windows_NT" ] || echo "$${OS:-unknown}" | grep -qi windows; then \
		PIDS=$$(netstat -ano | grep ':$(FRONTEND_PORT) ' | awk '{print $$5}' | sort -u | grep -v '^0$$' || true); \
		if [ -n "$$PIDS" ]; then \
			echo "  Found processes on port $(FRONTEND_PORT): $$PIDS"; \
			for pid in $$PIDS; do \
				echo "    Killing PID $$pid..."; \
				taskkill //F //PID $$pid 2>/dev/null || true; \
			done; \
			sleep 1; \
			echo "Frontend stopped"; \
		else \
			echo "No process found on port $(FRONTEND_PORT)"; \
		fi; \
	else \
		PIDS=$$(lsof -ti:$(FRONTEND_PORT) 2>/dev/null); \
		if [ -n "$$PIDS" ]; then \
			echo "  Found processes on port $(FRONTEND_PORT): $$PIDS"; \
			for pid in $$PIDS; do \
				pkill -9 -P $$pid 2>/dev/null || true; \
				kill -9 $$pid 2>/dev/null || true; \
			done; \
			sleep 1; \
			echo "Frontend stopped"; \
		else \
			echo "No process found on port $(FRONTEND_PORT)"; \
			NEXT_PIDS=$$(pgrep -f "next dev" 2>/dev/null || true); \
			if [ -n "$$NEXT_PIDS" ]; then \
				echo $$NEXT_PIDS | xargs kill -9 2>/dev/null || true; \
				echo "Frontend stopped"; \
			fi; \
		fi; \
	fi

stop: stop-backend stop-frontend
	@echo "All servers stopped"

# Restart targets
restart-backend: stop-backend
	@echo "Checking port availability..."
	@$(MAKE) check-port-available PORT=$(BACKEND_PORT)
	@echo "Restarting backend server..."
	@bash -c ' \
		SCRIPT_DIR="$$(pwd)"; \
		if command -v air > /dev/null 2>&1; then \
			(cd $$SCRIPT_DIR/$(BACKEND_DIR) && air) > /tmp/fintu-backend.log 2>&1 & \
		else \
			echo "   air not found, using go run ./cmd/api..."; \
			(cd $$SCRIPT_DIR/$(BACKEND_DIR) && go run ./cmd/api) > /tmp/fintu-backend.log 2>&1 & \
		fi; \
		BACKEND_PID=$$!; \
		echo "   Backend PID: $$BACKEND_PID"; \
		echo "   Backend logs: tail -f /tmp/fintu-backend.log"; \
		sleep 8; \
		if netstat -ano 2>/dev/null | grep -qi ":$(BACKEND_PORT).*LISTENING" || lsof -i:$(BACKEND_PORT) > /dev/null 2>&1; then \
			echo "Backend server restarted successfully"; \
		else \
			echo "Warning: Backend server may have failed to start"; \
			echo "   Check logs: tail -f /tmp/fintu-backend.log"; \
		fi \
	'

restart-frontend: stop-frontend
	@echo "Checking port availability..."
	@$(MAKE) check-port-available PORT=$(FRONTEND_PORT)
	@echo "Restarting frontend server..."
	@bash -c ' \
		SCRIPT_DIR="$$(pwd)"; \
		(cd $$SCRIPT_DIR/$(FRONTEND_DIR) && $(NPM) run dev) > /tmp/fintu-frontend.log 2>&1 & \
		FRONTEND_PID=$$!; \
		echo "   Frontend PID: $$FRONTEND_PID"; \
		echo "   Frontend logs: tail -f /tmp/fintu-frontend.log"; \
		sleep 8; \
		if netstat -ano 2>/dev/null | grep -qi ":$(FRONTEND_PORT).*LISTENING" || lsof -i:$(FRONTEND_PORT) > /dev/null 2>&1; then \
			echo "Frontend server restarted successfully"; \
		else \
			echo "Warning: Frontend server may have failed to start"; \
			echo "   Check logs: tail -f /tmp/fintu-frontend.log"; \
		fi \
	'

restart: stop check-ports-available
	@sleep 2
	@$(MAKE) dev

# =============================================================================
# Setup & Dependencies
# =============================================================================

setup:
	@echo "Setting up Fintu Tracking development environment..."
	@echo ""
	@echo "Installing backend dependencies..."
	@$(MAKE) deps
	@echo "Installing frontend dependencies..."
	@$(MAKE) deps-frontend
	@echo ""
	@echo "Setup complete!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Configure .env:    cp $(BACKEND_DIR)/.env.example $(BACKEND_DIR)/.env"
	@echo "  2. Update .env with your Supabase credentials"
	@echo "  3. Start dev servers: make dev"
	@echo ""

deps:
	@echo "Downloading Go dependencies..."
	@cd $(BACKEND_DIR) && $(GOMOD) download && $(GOMOD) verify && $(GOMOD) tidy
	@echo "Backend dependencies installed"
	@if ! command -v air > /dev/null 2>&1; then \
		echo "Installing air (hot reload)..."; \
		go install github.com/air-verse/air@latest; \
		echo "air installed"; \
	else \
		echo "air already installed"; \
	fi

deps-frontend:
	@echo "Installing frontend dependencies..."
	@cd $(FRONTEND_DIR) && $(NPM) install
	@echo "Frontend dependencies installed"

deps-all: deps deps-frontend

install: deps-all
