.PHONY: help install build test coverage lint security clean publish

# Default target
help:
	@echo "Polingo - Available commands:"
	@echo "  make install   - Install all dependencies"
	@echo "  make build     - Build all packages (with turbo caching)"
	@echo "  make test      - Run all tests (with turbo caching)"
	@echo "  make coverage  - Run tests with coverage (with turbo caching)"
	@echo "  make lint      - Run linter (with turbo caching)"
	@echo "  make security  - Run dependency and lockfile security checks"
	@echo "  make clean     - Clean build artifacts"
	@echo "  make publish   - Publish workspaces to npm (override PUBLISH_TAG/PUBLISH_FILTERS)"

# Install dependencies
install:
	pnpm install

# Build all packages
build:
	pnpm turbo run build

# Run tests
test:
	pnpm turbo run test

# Run tests with coverage
coverage:
	pnpm turbo run test:coverage

# Run linter
lint:
	pnpm turbo run lint

# Run security checks
security:
	pnpm run security

# Clean build artifacts
clean:
	pnpm -r exec rm -rf dist
	rm -rf node_modules .turbo
	pnpm -r exec rm -rf node_modules .turbo

# Publish all publishable workspaces to npm
PUBLISH_TAG ?= latest
PUBLISH_FILTERS ?=

publish:
	pnpm publish -r --access public --tag $(PUBLISH_TAG) $(PUBLISH_FILTERS)
