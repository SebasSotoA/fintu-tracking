# Load environment variables from backend/.env if it exists
# The '-include' directive will not fail if the file doesn't exist
-include backend/.env

# =============================================================================
# Project Configuration
# =============================================================================

# Detect OS
ifeq ($(OS),Windows_NT)
    DETECTED_OS := Windows
else
    DETECTED_OS := $(shell uname -s 2>/dev/null || echo Unknown)
endif

# Project metadata
PROJECT_NAME := fintu-tracking
VERSION := $(shell git describe --tags --always --dirty 2>nul || echo dev)
GIT_COMMIT := $(shell git rev-parse --short HEAD 2>nul || echo unknown)

ifeq ($(DETECTED_OS),Windows)
    BUILD_TIME := $(shell powershell -Command "Get-Date -Format 'yyyy-MM-dd_HH:mm:ss'")
else
    BUILD_TIME := $(shell date -u '+%Y-%m-%d_%H:%M:%S' 2>/dev/null || echo unknown)
endif

# Build configuration
APP_NAME := api
BIN_DIR := bin
BACKEND_DIR := backend
FRONTEND_DIR := frontend
COVERAGE_DIR := coverage

# Frontend configuration
FRONTEND_PORT := 3002

# Marketing (Astro) configuration
MARKETING_DIR := marketing
MARKETING_PORT := 4321

# Backend configuration
BACKEND_PORT := 8080

# Headroom (optional AI context compression)
HEADROOM_PORT := 8787

# Dev log files - ./logs/ is relative to project root (where Makefile lives)
LOG_DIR := logs
LOG_BACKEND := $(LOG_DIR)/fintu-backend.log
LOG_FRONTEND := $(LOG_DIR)/fintu-frontend.log
LOG_MARKETING := $(LOG_DIR)/fintu-marketing.log

# PID files for dev servers (machine-local, gitignored)
PID_DIR := .make/pids
PID_BACKEND := $(PID_DIR)/backend.pid
PID_FRONTEND := $(PID_DIR)/frontend.pid
PID_MARKETING := $(PID_DIR)/marketing.pid

# Dev startup readiness timeout (seconds)
STACK_READY_TIMEOUT := 20

# Hash-stamp directory for dependency skip (machine-local, gitignored)
STAMP_DIR := .make
GO_LOCKFILE := $(BACKEND_DIR)/go.sum
FRONTEND_LOCKFILE := $(FRONTEND_DIR)/pnpm-lock.yaml
MARKETING_LOCKFILE := $(MARKETING_DIR)/pnpm-lock.yaml
GO_STAMP := $(STAMP_DIR)/go.stamp
FRONTEND_STAMP := $(STAMP_DIR)/frontend.stamp
MARKETING_STAMP := $(STAMP_DIR)/marketing.stamp

# =============================================================================
# Tool Definitions
# =============================================================================

# Use bash shell (available with Git for Windows)
SHELL := bash
.SHELLFLAGS := -c

# Suppress "Entering/Leaving directory" messages
MAKEFLAGS += --no-print-directory

# Go tools
GO := go
GOFLAGS := -v
GOTEST := $(GO) test
GOBUILD := $(GO) build
GOCLEAN := $(GO) clean
GOMOD := $(GO) mod
GOFMT := gofmt
GOVET := $(GO) vet

# Air for hot reload
AIR := air

# Frontend tools
NPM := pnpm

# =============================================================================
# Build Flags
# =============================================================================

BUILD_FLAGS := -ldflags="-s -w"
BUILD_FLAGS += -ldflags="-X main.Version=$(VERSION)"
BUILD_FLAGS += -ldflags="-X main.BuildTime=$(BUILD_TIME)"
BUILD_FLAGS += -ldflags="-X main.GitCommit=$(GIT_COMMIT)"

# =============================================================================
# Output Helpers (ANSI colors)
# =============================================================================

ANSI_RESET := \033[0m
ANSI_GREEN := \033[32m
ANSI_YELLOW := \033[33m
ANSI_RED := \033[31m
ANSI_CYAN := \033[36m
ANSI_BOLD := \033[1m

print_success = @echo "$(ANSI_GREEN)$(1)$(ANSI_RESET)"
print_info = @echo "$(ANSI_CYAN)$(1)$(ANSI_RESET)"
print_warning = @echo "$(ANSI_YELLOW)$(1)$(ANSI_RESET)"
print_error = @echo "$(ANSI_RED)$(1)$(ANSI_RESET)"
