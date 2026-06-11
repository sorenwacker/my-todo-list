#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "Building Todo app..."
npm run build

echo "Packaging for macOS..."
npx electron-builder --mac

# Find the built .app
APP_NAME="Todo.app"
DIST_APP="$PROJECT_DIR/dist/mac-arm64/$APP_NAME"

if [ ! -d "$DIST_APP" ]; then
    DIST_APP="$PROJECT_DIR/dist/mac/$APP_NAME"
fi

if [ ! -d "$DIST_APP" ]; then
    echo "Error: Could not find built app"
    exit 1
fi

echo "Installing to /Applications..."
if [ -d "/Applications/$APP_NAME" ]; then
    echo "Removing existing installation..."
    rm -rf "/Applications/$APP_NAME"
fi

cp -R "$DIST_APP" /Applications/

echo "Done! Todo app installed to /Applications/$APP_NAME"
echo "You can now launch it from Applications or Spotlight."
