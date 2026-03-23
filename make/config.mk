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
FRONTEND_PORT := 3000

# Backend configuration
BACKEND_PORT := 8080

# Dev log files - use /tmp for bash compatibility on both Unix and Windows (Git Bash)
LOG_DIR := /tmp
LOG_BACKEND := $(LOG_DIR)/fintu-backend.log
LOG_FRONTEND := $(LOG_DIR)/fintu-frontend.log

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
NPM := npm

# =============================================================================
# Build Flags
# =============================================================================

BUILD_FLAGS := -ldflags="-s -w"
BUILD_FLAGS += -ldflags="-X main.Version=$(VERSION)"
BUILD_FLAGS += -ldflags="-X main.BuildTime=$(BUILD_TIME)"
BUILD_FLAGS += -ldflags="-X main.GitCommit=$(GIT_COMMIT)"
