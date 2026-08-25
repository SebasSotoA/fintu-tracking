# =============================================================================
# Development Workflow
# =============================================================================

.PHONY: check-env backend-dev frontend-dev dev start-dev-servers ensure-deps stop stop-backend stop-frontend stop-marketing restart setup install deps deps-frontend deps-marketing deps-all

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
		echo "air not found, using go run . dev..."; \
		cd $(BACKEND_DIR) && go run . dev; \
	fi

frontend-dev:
	@echo "Checking port availability..."
	@$(MAKE) check-port-available PORT=$(FRONTEND_PORT)
	@echo "Starting frontend server (foreground) on :$(FRONTEND_PORT)..."
	@cd $(FRONTEND_DIR) && $(NPM) exec next dev -p $(FRONTEND_PORT)

# Combined dev environment - starts both servers in background
dev: check-env ensure-deps ensure-ports-free
	@echo "Starting development environment..."
	@echo "  Backend:   http://localhost:$(BACKEND_PORT)"
	@echo "  Frontend:  http://localhost:$(FRONTEND_PORT)"
	@echo "  Marketing: http://localhost:$(MARKETING_PORT)"
	@echo ""
	@if [ ! -f $(BACKEND_DIR)/.env ]; then \
		echo "WARNING: $(BACKEND_DIR)/.env not found"; \
		echo "   Create it: cp $(BACKEND_DIR)/.env.example $(BACKEND_DIR)/.env"; \
		echo ""; \
	fi
	@$(MAKE) start-dev-servers

# Unified server launch block — used by both dev and restart.
# Launches all 3 servers in background, polls for readiness, early-exits on dead PID.
start-dev-servers:
	@bash -c ' \
		SCRIPT_DIR="$$(pwd)"; \
		mkdir -p "$$SCRIPT_DIR/$(LOG_DIR)"; \
		echo "Starting backend server..."; \
		if command -v air > /dev/null 2>&1; then \
			(cd $$SCRIPT_DIR/$(BACKEND_DIR) && air) > $(LOG_BACKEND) 2>&1 & \
		else \
			echo "   air not found, using go run . dev..."; \
			(cd $$SCRIPT_DIR/$(BACKEND_DIR) && go run . dev) > $(LOG_BACKEND) 2>&1 & \
		fi; \
		BACKEND_PID=$$!; \
		echo "   Backend PID: $$BACKEND_PID"; \
		echo "   Backend logs: tail -f $(LOG_BACKEND)"; \
		mkdir -p "$(PID_DIR)"; \
		echo $$BACKEND_PID > "$(PID_DIR)/backend.pid"; \
		echo ""; \
		ROUTES_FILE="$$SCRIPT_DIR/$(FRONTEND_DIR)/.next/dev/types/routes.d.ts"; \
		if [ -f "$$ROUTES_FILE" ] && ! grep -q "/dashboard" "$$ROUTES_FILE" 2>/dev/null; then \
			echo "Clearing corrupted Next.js dev cache (.next)..."; \
			rm -rf "$$SCRIPT_DIR/$(FRONTEND_DIR)/.next"; \
		fi; \
		echo "Starting frontend server..."; \
		(cd $$SCRIPT_DIR/$(FRONTEND_DIR) && $(NPM) exec next dev -p $(FRONTEND_PORT)) > $(LOG_FRONTEND) 2>&1 & \
		FRONTEND_PID=$$!; \
		echo "   Frontend PID: $$FRONTEND_PID"; \
		echo "   Frontend logs: tail -f $(LOG_FRONTEND)"; \
		mkdir -p "$(PID_DIR)"; \
		echo $$FRONTEND_PID > "$(PID_DIR)/frontend.pid"; \
		echo ""; \
		echo "Starting marketing server..."; \
		(cd $$SCRIPT_DIR/$(MARKETING_DIR) && $(NPM) dev) > $(LOG_MARKETING) 2>&1 & \
		MARKETING_PID=$$!; \
		echo "   Marketing PID: $$MARKETING_PID"; \
		echo "   Marketing logs: tail -f $(LOG_MARKETING)"; \
		mkdir -p "$(PID_DIR)"; \
		echo $$MARKETING_PID > "$(PID_DIR)/marketing.pid"; \
		echo ""; \
		port_listening() { \
			local p=$$1; \
			if command -v ss > /dev/null 2>&1; then \
				ss -tlnp 2>/dev/null | grep -q ":$$p "; \
			elif command -v netstat > /dev/null 2>&1; then \
				netstat -ano 2>/dev/null | grep -qi ":$$p.*LISTENING"; \
			else \
				lsof -i:$$p > /dev/null 2>&1; \
			fi; \
		}; \
		process_alive() { \
			kill -0 $$1 2>/dev/null; \
		}; \
		dump_log() { \
			local label=$$1; local log=$$2; \
			echo ""; \
			echo "=== $$label failed to start ==="; \
			echo "--- last 20 lines of $$log ---"; \
			tail -n 20 "$$log" 2>/dev/null || echo "(no log file)"; \
			echo "==="; \
		}; \
		BACKEND_UP=false; \
		FRONTEND_UP=false; \
		MARKETING_UP=false; \
		_elapsed=0; \
		_max_wait=$(STACK_READY_TIMEOUT); \
		_interval=1; \
		while [ $$_elapsed -lt $$_max_wait ]; do \
			if [ "$$BACKEND_UP" = false ] && port_listening $(BACKEND_PORT); then BACKEND_UP=true; fi; \
			if [ "$$FRONTEND_UP" = false ] && port_listening $(FRONTEND_PORT); then FRONTEND_UP=true; fi; \
			if [ "$$MARKETING_UP" = false ] && port_listening $(MARKETING_PORT); then MARKETING_UP=true; fi; \
			if [ "$$BACKEND_UP" = true ] && [ "$$FRONTEND_UP" = true ] && [ "$$MARKETING_UP" = true ]; then break; fi; \
			if ! process_alive $$BACKEND_PID && [ "$$BACKEND_UP" = false ]; then \
				dump_log "Backend" "$(LOG_BACKEND)"; exit 1; \
			fi; \
			if ! process_alive $$FRONTEND_PID && [ "$$FRONTEND_UP" = false ]; then \
				dump_log "Frontend" "$(LOG_FRONTEND)"; exit 1; \
			fi; \
			if ! process_alive $$MARKETING_PID && [ "$$MARKETING_UP" = false ]; then \
				dump_log "Marketing" "$(LOG_MARKETING)"; exit 1; \
			fi; \
			sleep $$_interval; \
			_elapsed=$$((_elapsed + _interval)); \
		done; \
		if [ "$$BACKEND_UP" = true ] && [ "$$FRONTEND_UP" = true ] && [ "$$MARKETING_UP" = true ]; then \
			echo "Development servers started successfully"; \
		else \
			[ "$$BACKEND_UP" = false ] && echo "Warning: Backend failed to start (check $(LOG_BACKEND))"; \
			[ "$$FRONTEND_UP" = false ] && echo "Warning: Frontend failed to start (check $(LOG_FRONTEND))"; \
			[ "$$MARKETING_UP" = false ] && echo "Warning: Marketing failed to start (check $(LOG_MARKETING))"; \
		fi; \
		echo ""; \
		echo "Useful commands:"; \
		echo "   View backend logs:  tail -f $(LOG_BACKEND)"; \
		echo "   View frontend logs: tail -f $(LOG_FRONTEND)"; \
		echo "   View marketing logs: tail -f $(LOG_MARKETING)"; \
		echo "   Stop servers:       make stop"; \
		echo "   Health check:       make health-check"; \
		echo "" \
	'

# Restart fast path: clear ports and launch servers (skip install/check-env).
restart: ensure-ports-free
	@echo "Restarting development servers..."
	@$(MAKE) start-dev-servers

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
		fi; \
		echo "Backend stopped"; \
	else \
		_kill_pid_file() { \
			local pidfile=$$1; \
			[ -f "$$pidfile" ] && kill -9 $$(cat $$pidfile) 2>/dev/null || true; \
			rm -f "$$pidfile"; \
		}; \
		_kill_by_port() { \
			local p=$$1; \
			if command -v ss > /dev/null 2>&1; then \
				ss -tlnp 2>/dev/null | grep ":$$p " | grep -oP 'pid=\K\d+' | xargs kill -9 2>/dev/null || true; \
			else \
				lsof -ti:$$p 2>/dev/null | xargs kill -9 2>/dev/null || true; \
			fi; \
		}; \
		_kill_pid_file "$(PID_BACKEND)"; \
		_kill_by_port $(BACKEND_PORT); \
		sleep 1; \
		echo "Backend stopped"; \
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
		fi; \
		echo "Frontend stopped"; \
	else \
		_kill_pid_file() { \
			local pidfile=$$1; \
			[ -f "$$pidfile" ] && kill -9 $$(cat $$pidfile) 2>/dev/null || true; \
			rm -f "$$pidfile"; \
		}; \
		_kill_by_port() { \
			local p=$$1; \
			if command -v ss > /dev/null 2>&1; then \
				ss -tlnp 2>/dev/null | grep ":$$p " | grep -oP 'pid=\K\d+' | xargs kill -9 2>/dev/null || true; \
			else \
				lsof -ti:$$p 2>/dev/null | xargs kill -9 2>/dev/null || true; \
			fi; \
		}; \
		_kill_pid_file "$(PID_FRONTEND)"; \
		_kill_by_port $(FRONTEND_PORT); \
		sleep 1; \
		echo "Frontend stopped"; \
	fi

stop-marketing:
	@echo "Stopping marketing server..."
	@if [ "$$(uname -s 2>/dev/null || echo Windows)" = "Windows_NT" ] || echo "$${OS:-unknown}" | grep -qi windows; then \
		PIDS=$$(netstat -ano | grep ':$(MARKETING_PORT) ' | awk '{print $$5}' | sort -u | grep -v '^0$$' || true); \
		if [ -n "$$PIDS" ]; then \
			echo "  Found processes on port $(MARKETING_PORT): $$PIDS"; \
			for pid in $$PIDS; do \
				echo "    Killing PID $$pid..."; \
				taskkill //F //PID $$pid 2>/dev/null || true; \
			done; \
			sleep 1; \
		fi; \
		echo "Marketing stopped"; \
	else \
		_kill_pid_file() { \
			local pidfile=$$1; \
			[ -f "$$pidfile" ] && kill -9 $$(cat $$pidfile) 2>/dev/null || true; \
			rm -f "$$pidfile"; \
		}; \
		_kill_by_port() { \
			local p=$$1; \
			if command -v ss > /dev/null 2>&1; then \
				ss -tlnp 2>/dev/null | grep ":$$p " | grep -oP 'pid=\K\d+' | xargs kill -9 2>/dev/null || true; \
			else \
				lsof -ti:$$p 2>/dev/null | xargs kill -9 2>/dev/null || true; \
			fi; \
		}; \
		_kill_pid_file "$(PID_MARKETING)"; \
		_kill_by_port $(MARKETING_PORT); \
		sleep 1; \
		echo "Marketing stopped"; \
	fi

stop: stop-backend stop-frontend stop-marketing
	@echo "All servers stopped"

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
	@echo "Installing marketing dependencies..."
	@$(MAKE) deps-marketing
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

deps-all: deps deps-frontend deps-marketing

install: deps-all

# Hash-stamp gate: skip install when lockfiles unchanged.
# FORCE_INSTALL=1 bypasses the cache and always runs install.
ensure-deps:
	@mkdir -p $(STAMP_DIR)
	@_changed=false; \
	if [ -n "$(FORCE_INSTALL)" ]; then \
		_changed=true; \
		echo "Force install requested"; \
	else \
		for pair in "$(GO_LOCKFILE):$(GO_STAMP)" "$(FRONTEND_LOCKFILE):$(FRONTEND_STAMP)" "$(MARKETING_LOCKFILE):$(MARKETING_STAMP)"; do \
			lock="$${pair%%:*}"; \
			stamp="$${pair##*:}"; \
			if [ ! -f "$$stamp" ]; then \
				_changed=true; echo "   $$stamp missing"; \
			else \
				current=$$(sha256sum "$$lock" | awk '{print $$1}'); \
				stored=$$(cat "$$stamp" 2>/dev/null); \
				if [ "$$current" != "$$stored" ]; then \
					_changed=true; echo "   $$lock changed"; \
				fi; \
			fi; \
		done; \
	fi; \
	if [ "$$_changed" = true ]; then \
		echo "Installing dependencies..."; \
		$(MAKE) install; \
		sha256sum $(GO_LOCKFILE) | awk '{print $$1}' > $(GO_STAMP); \
		sha256sum $(FRONTEND_LOCKFILE) | awk '{print $$1}' > $(FRONTEND_STAMP); \
		sha256sum $(MARKETING_LOCKFILE) | awk '{print $$1}' > $(MARKETING_STAMP); \
		echo "Dependencies installed and stamps updated"; \
	else \
		echo "Dependencies unchanged - skipping install"; \
	fi
