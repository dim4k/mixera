# MixEra Automation (Docker Only)

# Variables
PROJECT_DIR := $(CURDIR)
BUILDER_IMAGE := mobile-builder
DOCKER_RUN := docker run --rm -v "$(PROJECT_DIR):/project" -w /project $(BUILDER_IMAGE)

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

# --- Main Command: Build APK ---
apk:
	@echo "Building APK..."
	$(DOCKER_RUN) bash -c "npm install && npm run build && npx capacitor-assets generate --android && npx cap sync android && cd android && ./gradlew assembleDebug"
	@echo "APK available at: android/app/build/outputs/apk/debug/app-debug.apk"

# --- Development ---
# Note: Vite needs --host to expose port outside container
dev:
	@echo "Starting Dev Server..."
	docker run --rm -it -v "$(PROJECT_DIR):/project" -w /project -p 5173:5173 $(BUILDER_IMAGE) npm run dev -- --host 0.0.0.0

# --- Helper Commands ---
build:
	$(DOCKER_RUN) npm run build

sync:
	$(DOCKER_RUN) npx cap sync android

assets:
	$(DOCKER_RUN) npx capacitor-assets generate --android

shell:
	docker run --rm -it -v "$(PROJECT_DIR):/project" -w /project $(BUILDER_IMAGE) bash

clean:
	$(DOCKER_RUN) bash -c "rm -rf dist android/app/build"
