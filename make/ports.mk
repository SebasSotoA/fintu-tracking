# Ports Module
# Port checking, killing, and management utilities

.PHONY: check-port-available check-ports-available ensure-ports-free netstat-ports kill-port

# Check if a single port is available
check-port-available:
	@if [ -z "$(PORT)" ]; then \
		echo "Error: PORT parameter is required"; \
		echo "   Usage: make check-port-available PORT=8080"; \
		exit 1; \
	fi
	@echo "Checking if port $(PORT) is available..."
	@if [ "$$(uname -s 2>/dev/null || echo Windows)" = "Windows_NT" ] || echo "$${OS:-unknown}" | grep -qi windows; then \
		RESULT=$$(netstat -ano | findstr ":$(PORT) " | findstr "LISTENING" || true); \
		if [ -n "$$RESULT" ]; then \
			echo "Port $(PORT) is already in use"; \
			echo "  Run: make kill-port PORT=$(PORT)"; \
			exit 1; \
		else \
			echo "Port $(PORT) is available"; \
		fi; \
	else \
		if lsof -i:$(PORT) > /dev/null 2>&1; then \
			echo "Port $(PORT) is already in use"; \
			echo "  Run: make kill-port PORT=$(PORT)"; \
			exit 1; \
		else \
			echo "Port $(PORT) is available"; \
		fi; \
	fi

# Check if all required dev ports are available
check-ports-available:
	@echo "Checking port availability..."
	@$(MAKE) check-port-available PORT=$(BACKEND_PORT)
	@$(MAKE) check-port-available PORT=$(FRONTEND_PORT)
	@echo "All required ports are available"

# Ensure dev ports are free — kill any process using them
ensure-ports-free:
	@echo "Ensuring required ports are available..."
	@if [ "$$(uname -s 2>/dev/null || echo Windows)" = "Windows_NT" ] || echo "$${OS:-unknown}" | grep -qi windows; then \
		RESULT_BACKEND=$$(netstat -ano | findstr ":$(BACKEND_PORT) " | findstr "LISTENING" || true); \
		if [ -n "$$RESULT_BACKEND" ]; then \
			echo "   Port $(BACKEND_PORT) in use - killing process..."; \
			$(MAKE) kill-port PORT=$(BACKEND_PORT) > /dev/null 2>&1 || true; \
			sleep 1; \
		fi; \
		RESULT_FRONTEND=$$(netstat -ano | findstr ":$(FRONTEND_PORT) " | findstr "LISTENING" || true); \
		if [ -n "$$RESULT_FRONTEND" ]; then \
			echo "   Port $(FRONTEND_PORT) in use - killing process..."; \
			$(MAKE) kill-port PORT=$(FRONTEND_PORT) > /dev/null 2>&1 || true; \
			sleep 1; \
		fi; \
	else \
		if lsof -i:$(BACKEND_PORT) > /dev/null 2>&1; then \
			echo "   Port $(BACKEND_PORT) in use - killing process..."; \
			$(MAKE) kill-port PORT=$(BACKEND_PORT) > /dev/null 2>&1 || true; \
			sleep 1; \
		fi; \
		if lsof -i:$(FRONTEND_PORT) > /dev/null 2>&1; then \
			echo "   Port $(FRONTEND_PORT) in use - killing process..."; \
			$(MAKE) kill-port PORT=$(FRONTEND_PORT) > /dev/null 2>&1 || true; \
			sleep 1; \
		fi; \
	fi
	@echo "Ports $(BACKEND_PORT) and $(FRONTEND_PORT) are ready"

# Show processes using dev ports
netstat-ports:
	@echo "Checking ports $(BACKEND_PORT) and $(FRONTEND_PORT)..."
	@echo ""
	@if [ "$$(uname -s 2>/dev/null || echo Windows)" = "Windows_NT" ] || echo "$${OS:-unknown}" | grep -qi windows; then \
		echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
		echo "  Windows - Port $(BACKEND_PORT) (Backend)"; \
		echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
		RESULT=$$(netstat -ano | findstr ':$(BACKEND_PORT)' || echo "No process found"); \
		echo "$$RESULT"; \
		echo ""; \
		echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
		echo "  Windows - Port $(FRONTEND_PORT) (Frontend)"; \
		echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
		RESULT=$$(netstat -ano | findstr ':$(FRONTEND_PORT)' || echo "No process found"); \
		echo "$$RESULT"; \
		echo ""; \
		echo "  To kill a process: make kill-port PORT=<port>"; \
	else \
		echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
		echo "  Unix/Linux - Port $(BACKEND_PORT) (Backend)"; \
		echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
		lsof -i:$(BACKEND_PORT) || echo "No process found"; \
		echo ""; \
		echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
		echo "  Unix/Linux - Port $(FRONTEND_PORT) (Frontend)"; \
		echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
		lsof -i:$(FRONTEND_PORT) || echo "No process found"; \
		echo ""; \
		echo "  To kill a process: make kill-port PORT=<port>"; \
	fi

# Kill process on a specific port (Windows & Unix)
kill-port:
	@if [ -z "$(PORT)" ]; then \
		echo "Error: PORT parameter is required"; \
		echo "   Usage: make kill-port PORT=8080"; \
		exit 1; \
	fi
	@echo "Killing process on port $(PORT)..."
	@if [ "$$(uname -s 2>/dev/null || echo Windows)" = "Windows_NT" ] || echo "$${OS:-unknown}" | grep -qi windows; then \
		echo "  Windows environment detected"; \
		PIDS=$$(netstat -ano | grep ':$(PORT) ' | awk '{print $$5}' | sort -u | grep -v '^0$$' || true); \
		if [ -n "$$PIDS" ]; then \
			echo "  Found processes on port $(PORT): $$PIDS"; \
			for pid in $$PIDS; do \
				echo "    Killing PID $$pid..."; \
				taskkill //F //PID $$pid 2>/dev/null || true; \
			done; \
			echo "Process(es) killed"; \
		else \
			echo "No process found on port $(PORT)"; \
		fi; \
	else \
		echo "  Unix/Linux environment detected"; \
		PIDS=$$(lsof -ti:$(PORT) 2>/dev/null || true); \
		if [ -n "$$PIDS" ]; then \
			echo "  Found processes on port $(PORT): $$PIDS"; \
			for pid in $$PIDS; do \
				echo "    Killing PID $$pid and its children..."; \
				pkill -9 -P $$pid 2>/dev/null || true; \
				kill -9 $$pid 2>/dev/null || true; \
			done; \
			echo "Process(es) killed"; \
		else \
			echo "No process found on port $(PORT)"; \
		fi; \
	fi
