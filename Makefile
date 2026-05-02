# Project task entrypoint. Run `make` or `make help` to list targets.
# Add "## description" at end of a target line to show it in help.

.PHONY: help install dev build preview typecheck lint test test-watch check

# First target is default
help: ## Show this help (default)
	@echo "Usage: make [target]"
	@echo ""
	@awk -F'## ' '/^[a-zA-Z0-9_-]+:.*## / {split($$1, a, ":"); printf "  %-15s %s\n", a[1], $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies (pnpm install)
	pnpm install

dev: ## Start Vite dev server
	pnpm dev

build: ## Production build (tsc + vite build)
	pnpm build

preview: ## Preview production build
	pnpm preview

typecheck: ## TypeScript typecheck
	pnpm typecheck

lint: ## Run ESLint
	pnpm lint

test: ## Run tests once (vitest run)
	pnpm test

test-watch: ## Run tests in watch mode (vitest)
	pnpm test:watch

check: ## Run typecheck, lint, then test (local verification)
	pnpm typecheck && pnpm lint && pnpm test
