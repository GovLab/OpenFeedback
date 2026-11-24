#!/bin/bash
# Start the OpenFeedback back end and front end for local development.
# Run from the repo root after the setup steps in README.md. Ctrl+C stops both.
set -euo pipefail
cd "$(dirname "$0")"

cleanup() {
  echo "Stopping servers..."
  kill "${BACKEND_PID:-}" "${FRONTEND_PID:-}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting back end on http://localhost:8003 (API docs at /docs)"
(cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8003 --reload) &
BACKEND_PID=$!

echo "Starting front end on http://localhost:3000"
(cd frontend && npm run dev) &
FRONTEND_PID=$!

wait
