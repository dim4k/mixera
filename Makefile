# MixEra Automation (Docker Only)

# Variables
PROJECT_DIR := $(CURDIR)
# Use docker compose run to leverage existing config
DOCKER_RUN := docker compose run --rm app

.PHONY: help apk dev build sync assets clean shell

help:
	@echo "MixEra Automation (Fully Dockerized)"
	@echo "-----------------------------------"
	@echo "make apk      - Build Android APK (npm install -> build -> assets -> sync -> gradle)"
	@echo "make dev      - Start development server (exposed on port 5173)"
	@echo "make build    - Build web assets (npm run build)"
	@echo "make sync     - Sync Capacitor with Android"
	@echo "make assets   - Generate icons/splash"
	@echo "make shell    - Open a bash shell inside the container"
	@echo "make clean    - Clean build artifacts"
	@echo "make check    - Run all checks (lint + type-check)"
	@echo "make lint     - Run ESLint"
	@echo "make format   - Run Prettier"

# --- Main Command: Build APK ---
apk:
	@echo "Building APK..."
	docker compose run --rm android-build bash -c "npm install && npm run build && npx @capacitor/assets generate --android && npx cap sync android && cd android && ./gradlew assembleDebug"
	@echo "APK available at: android/app/build/outputs/apk/debug/app-debug.apk"

# --- Development ---
# Note: Vite needs --host to expose port outside container
dev:
	@echo "Starting Dev Server..."
	docker compose up

# --- Helper Commands ---
build:
	$(DOCKER_RUN) npm run build

sync:
	$(DOCKER_RUN) npx cap sync android

assets:
	$(DOCKER_RUN) npx @capacitor/assets generate --android

shell:
	docker compose run --rm -it app sh

clean:
	$(DOCKER_RUN) bash -c "rm -rf dist android/app/build"

# --- QA & Code Quality ---
lint:
	$(DOCKER_RUN) npm run lint

format:
	$(DOCKER_RUN) npm run format

type-check:
	$(DOCKER_RUN) npm run type-check

check: lint type-check
	@echo "All checks passed!"
