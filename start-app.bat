@echo off
REM Start the OpenFeedback back end and front end for local development.
REM Run from the repo root after the setup steps in README.md.
REM Each server opens in its own window; close the windows to stop them.
cd /d "%~dp0"

echo Starting back end on http://localhost:8003 (API docs at /docs)
start "OpenFeedback back end" cmd /k "cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8003 --reload"

echo Starting front end on http://localhost:3000
start "OpenFeedback front end" cmd /k "cd frontend && npm run dev"
