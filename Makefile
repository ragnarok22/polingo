.PHONY: help install build test coverage lint clean publish

# Default target
help:
	@echo "Polingo - Available commands:"
	@echo "  make install   - Install all dependencies"
	@echo "  make build     - Build all packages"
	@echo "  make test      - Run all tests"
	@echo "  make coverage  - Run tests with coverage"
	@echo "  make lint      - Run linter"
	@echo "  make clean     - Clean build artifacts"
	@echo "  make publish   - Publish workspaces to npm (override PUBLISH_TAG/PUBLISH_FILTERS)"

# Install dependencies
install:
	pnpm install

# Build all packages
build:
	pnpm -r build

# Run tests
test:
	pnpm -r run test

# Run tests with coverage
coverage:
	pnpm -r --if-present test:coverage

# Run linter
lint:
	pnpm lint

# Clean build artifacts
clean:
	pnpm -r exec rm -rf dist
	rm -rf node_modules
	pnpm -r exec rm -rf node_modules

# Publish all publishable workspaces to npm
PUBLISH_TAG ?= latest
PUBLISH_FILTERS ?=

publish:
	pnpm publish -r --access public --tag $(PUBLISH_TAG) $(PUBLISH_FILTERS)
