# Makefile for managing the AWS CDK Bootstrap project

# Use bash for all shell commands
SHELL := /bin/bash

# Default target when 'make' is run without arguments
.DEFAULT_GOAL := help

## --------------------------------------
## Project Setup & Dependencies
## --------------------------------------

.PHONY: install
install: ## Install project dependencies using yarn
	@echo "📦 Installing dependencies..."
	@yarn install --frozen-lockfile

## --------------------------------------
## Code Quality & Testing
## --------------------------------------

.PHONY: lint
lint: ## Run the linter to check for code quality issues
	@echo "🧹 Linting code..."
	@yarn lint

.PHONY: format
format: ## Format the code using Prettier
	@echo "💅 Formatting code..."
	@yarn format

.PHONY: check-format
check-format: ## Check code formatting without making changes
	@echo "🔍 Checking code formatting..."
	@yarn format:check

.PHONY: test
test: ## Run unit tests
	@echo "🧪 Running tests..."
	@yarn test

.PHONY: check
check: lint check-format ## Run all code quality checks (linting and formatting)
	@echo "✅ All checks passed."

## --------------------------------------
## Build & CDK Operations
## --------------------------------------

.PHONY: build
build: ## Compile TypeScript to JavaScript
	@echo "🔨 Building project..."
	@yarn build

.PHONY: synth
synth: ## Synthesize CloudFormation templates
	@echo "✨ Synthesizing CloudFormation templates..."
	@npx cdk synth $(STACK)

.PHONY: diff
diff: ## Compare deployed stack with current state. Use 'make diff STACK=MyStack'
	@echo "🔄 Comparing stack with current state..."
	@npx cdk diff $(STACK)

.PHONY: deploy
deploy: ## Deploy stacks to AWS. Use 'make deploy STACK=MyStack' or 'make deploy STACK="*"'
	@echo "🚀 Deploying stack(s)..."
	@npx cdk deploy $(STACK) --require-approval never

.PHONY: destroy
destroy: ## Destroy stacks. Use 'make destroy STACK=MyStack'
	@echo "🔥 Destroying stack(s)..."
	@npx cdk destroy $(STACK) --force

.PHONY: help
help: ## Display this help screen
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'