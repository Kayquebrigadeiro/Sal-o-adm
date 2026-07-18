#!/usr/bin/env bash
# Helper to install deps, start server in background, run test runner, and stop the server.
# Usage: bash run-full-tests.sh
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "Installing dependencies (npm ci)..."
npm install --silent

# Start server in background
echo "Starting server..."
node src/server.js > /tmp/backend-node.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Ensure server is stopped on exit
cleanup() {
  echo "Stopping server (PID $SERVER_PID)"
  kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

# Wait for health endpoint
BASE_URL="http://localhost:3333"
for i in {1..30}; do
  if curl -sSf "$BASE_URL/health" >/dev/null 2>&1; then
    echo "Server healthy"
    break
  fi
  echo "Waiting for server... ($i)"
  sleep 1
done

# Run the Node test runner
echo "Running test runner"
node run-full-tests.js
EXIT_CODE=$?

echo "Test runner exited with $EXIT_CODE"
exit $EXIT_CODE
