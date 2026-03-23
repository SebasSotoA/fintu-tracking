# Fintu Tracking - Master Makefile
# Modular development workflow for Go backend + Next.js frontend

include make/config.mk
include make/help.mk
include make/ports.mk
include make/dev.mk
include make/build.mk
include make/test.mk
include make/validation.mk

# Consolidated .PHONY declarations for all targets
.PHONY: help help-short check-env dev backend-dev frontend-dev stop stop-backend stop-frontend restart restart-backend restart-frontend setup install deps deps-frontend deps-all netstat-ports kill-port check-port-available check-ports-available ensure-ports-free build build-frontend build-all fmt vet lint lint-frontend check check-all clean clean-frontend test test-verbose test-coverage test-coverage-view test-short test-unit test-api health-check open-frontend validate-app

# Default target
.DEFAULT_GOAL := help
