# =============================================================================
# Headroom - Optional AI context compression (developer-only)
# =============================================================================

.PHONY: headroom-install headroom-uninstall headroom-doctor headroom-mcp headroom-learn headroom-proxy

HEADROOM_PORT ?= 8787

# Install headroom via uv as an isolated developer tool.
headroom-install:
	@if ! command -v uv > /dev/null 2>&1; then \
		echo "uv is required. Install it from https://docs.astral.sh/uv/getting-started/installation/"; \
		exit 1; \
	fi
	@echo "Installing headroom via uv..."
	uv tool install headroom-ai
	@echo ""
	@echo "Headroom installed. Next steps:"
	@echo "  1. Verify:    make headroom-doctor"
	@echo "  2. MCP:       make headroom-mcp"
	@echo "  3. Restart Claude Code so the MCP tools are available"
	@echo ""
	@echo "Note: Some headroom extras (e.g. [all], [vector]) require a C++ toolchain"
	@echo "      and may fail on Windows without Visual Studio Build Tools."
	@echo "      The default install includes the core CLI, MCP server, and proxy."

# Remove the headroom tool from the isolated uv environment.
headroom-uninstall:
	@echo "Uninstalling headroom..."
	uv tool uninstall headroom-ai
	@echo "headroom removed."

# Run headroom's self-diagnostic checks.
headroom-doctor:
	@headroom doctor

# Register headroom as a Claude Code MCP server (per-user config, not repo state).
headroom-mcp:
	@headroom mcp install
	@echo "MCP server registered. Restart Claude Code."

# Mine past Claude Code sessions and write local corrections to CLAUDE.local.md.
headroom-learn:
	@headroom learn

# Start the headroom proxy on HEADROOM_PORT (default 8787).
headroom-proxy:
	@headroom proxy --port $(HEADROOM_PORT)
