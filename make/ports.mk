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
	elif command -v ss > /dev/null 2>&1; then \
		if ss -tlnp 2>/dev/null | grep -q ":$(PORT) "; then \
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
	@$(MAKE) check-port-available PORT=$(MARKETING_PORT)
	@echo "All required ports are available"

# Ensure dev ports are free — kill any process using them
ensure-ports-free:
	@echo "Ensuring required ports are available..."
	@bash -c ' \
		_port_in_use() { \
			local p=$$1; \
			if command -v ss > /dev/null 2>&1; then \
				ss -tlnp 2>/dev/null | grep -q ":$$p "; \
			elif command -v netstat > /dev/null 2>&1; then \
				netstat -ano 2>/dev/null | grep -qi ":$$p.*LISTENING"; \
			else \
				lsof -i:$$p > /dev/null 2>&1; \
			fi; \
		}; \
		_kill_port() { \
			local p=$$1; \
			if command -v ss > /dev/null 2>&1; then \
				ss -tlnp 2>/dev/null | grep ":$$p " | grep -oP "pid=\K\d+" | xargs kill -9 2>/dev/null || true; \
			else \
				lsof -ti:$$p 2>/dev/null | xargs kill -9 2>/dev/null || true; \
			fi; \
		}; \
		if _port_in_use $(BACKEND_PORT); then \
			echo "   Port $(BACKEND_PORT) in use - killing process..."; \
			_kill_port $(BACKEND_PORT); \
			sleep 1; \
		fi; \
		if _port_in_use $(FRONTEND_PORT); then \
			echo "   Port $(FRONTEND_PORT) in use - killing process..."; \
			_kill_port $(FRONTEND_PORT); \
			sleep 1; \
		fi; \
		if _port_in_use $(MARKETING_PORT); then \
			echo "   Port $(MARKETING_PORT) in use - killing process..."; \
			_kill_port $(MARKETING_PORT); \
			sleep 1; \
		fi; \
		echo "Ports $(BACKEND_PORT), $(FRONTEND_PORT), and $(MARKETING_PORT) are ready"; \
	'

# Show processes using dev ports
netstat-ports:
	@echo "Checking ports $(BACKEND_PORT), $(FRONTEND_PORT), and $(MARKETING_PORT)..."
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
		echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
		echo "  Windows - Port $(MARKETING_PORT) (Marketing)"; \
		echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
		RESULT=$$(netstat -ano | findstr ':$(MARKETING_PORT)' || echo "No process found"); \
		echo "$$RESULT"; \
		echo ""; \
		echo "  To kill a process: make kill-port PORT=<port>"; \
	elif command -v ss > /dev/null 2>&1; then \
		echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
		echo "  Linux - Port $(BACKEND_PORT) (Backend)"; \
		echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
		ss -tlnp 2>/dev/null | grep ":$(BACKEND_PORT) " || echo "No process found"; \
		echo ""; \
		echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
		echo "  Linux - Port $(FRONTEND_PORT) (Frontend)"; \
		echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
		ss -tlnp 2>/dev/null | grep ":$(FRONTEND_PORT) " || echo "No process found"; \
		echo ""; \
		echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
		echo "  Linux - Port $(MARKETING_PORT) (Marketing)"; \
		echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
		ss -tlnp 2>/dev/null | grep ":$(MARKETING_PORT) " || echo "No process found"; \
		echo ""; \
		echo "  To kill a process: make kill-port PORT=<port>"; \
	else \
		echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
		echo "  Unix/Linux (lsof) - Port $(BACKEND_PORT) (Backend)"; \
		echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
		lsof -i:$(BACKEND_PORT) || echo "No process found"; \
		echo ""; \
		echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
		echo "  Unix/Linux (lsof) - Port $(FRONTEND_PORT) (Frontend)"; \
		echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
		lsof -i:$(FRONTEND_PORT) || echo "No process found"; \
		echo ""; \
		echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
		echo "  Unix/Linux (lsof) - Port $(MARKETING_PORT) (Marketing)"; \
		echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; \
		lsof -i:$(MARKETING_PORT) || echo "No process found"; \
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
	elif command -v ss > /dev/null 2>&1; then \
		echo "  Linux environment detected (ss)"; \
		PIDS=$$(ss -tlnp 2>/dev/null | grep ":$(PORT) " | grep -oP 'pid=\K\d+' | sort -u || true); \
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
	else \
		echo "  Unix/Linux environment detected (lsof)"; \
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
