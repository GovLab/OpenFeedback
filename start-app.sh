#!/bin/bash

# Startup script for Feedback Classification System on Linux/Mac
echo "Starting Feedback Classification System..."

echo "Clearing existing processes..."
# Kill Python/Node processes
pkill -f "uvicorn" 2>/dev/null
pkill -f "next dev" 2>/dev/null

echo "Starting backend server on port 8003..."
# Start backend in background with normal logging
cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8003 --reload --log-level debug &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

echo "Starting frontend development server..."
# Start frontend in background
cd frontend && npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 3

echo ""
echo "🚀 Feedback Classification System is ready!"
echo ""
echo "Frontend: http://localhost:3001 (typically 3001)"
echo "Backend:  http://localhost:8003 (port 8003)"
echo "API Docs: http://localhost:8003/docs"
echo ""
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Press Ctrl+C to stop both servers."
echo ""

# Wait for exit command
wait

# Cleanup on exit
echo "Shutting down servers..."
kill $BACKEND_PID 2>/dev/null
kill $FRONTEND_PID 2>/dev/null
