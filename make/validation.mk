# Validation Module
# Health checks and application validation

.PHONY: health-check open-frontend validate-app

# Check backend health endpoint
health-check:
	@echo "Checking backend health..."
	@if curl -f -s http://localhost:$(BACKEND_PORT)/health > /dev/null 2>&1; then \
		echo "Backend is healthy at http://localhost:$(BACKEND_PORT)"; \
	else \
		echo "Backend health check failed"; \
		echo "  Make sure backend is running: make backend-dev"; \
		exit 1; \
	fi

# Open frontend in the default browser (cross-platform)
open-frontend:
	@echo "Opening frontend in browser..."
	@if [ "$$(uname -s 2>/dev/null || echo Windows)" = "Windows_NT" ] || echo "$${OS:-unknown}" | grep -qi windows; then \
		start http://localhost:$(FRONTEND_PORT) 2>/dev/null || true; \
	elif command -v open >/dev/null 2>&1; then \
		open http://localhost:$(FRONTEND_PORT); \
	elif command -v xdg-open >/dev/null 2>&1; then \
		xdg-open http://localhost:$(FRONTEND_PORT); \
	else \
		echo "  Open manually: http://localhost:$(FRONTEND_PORT)"; \
	fi

# Full app validation: health check + open browser + show URLs
validate-app: health-check
	@echo ""
	@$(MAKE) open-frontend
	@echo ""
	@echo "═══════════════════════════════════════════════════════════════"
	@echo "  Application Validation"
	@echo "═══════════════════════════════════════════════════════════════"
	@echo ""
	@echo "  Backend:  http://localhost:$(BACKEND_PORT)"
	@echo "  Frontend: http://localhost:$(FRONTEND_PORT)"
	@echo ""
	@echo "  Please verify the application is working in your browser."
	@echo ""
