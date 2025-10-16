@echo off
echo Starting Feedback Classification System...
echo Listing existing relevant processes...
echo.
echo Backend (python/uvicorn) processes:
tasklist /FI "IMAGENAME eq python.exe" | findstr /I "python"
echo.
echo Frontend (node/Next.js) processes:
tasklist /FI "IMAGENAME eq node.exe" | findstr /I "node"
echo.
echo Clearing existing processes...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq *uvicorn*" >nul 2>&1
taskkill /F /IM node.exe /FI "WINDOWTITLE eq *Next*dev*" >nul 2>&1

echo Starting backend on port 8003 (with debug logging enabled)...
start "Backend Server (DEBUG LOGS)" cmd /k "cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8003 --log-level debug"

timeout /t 2 /nobreak >nul

echo Starting frontend development server...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo Verifying servers are running...
timeout /t 2 /nobreak >nul

echo.
echo 🚀 Feedback Classification System is ready!
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8003
echo API Docs: http://localhost:8003/docs
echo.
echo Both servers are now running in separate CMD windows.
echo To stop them, close the CMD windows or end the processes.
echo.

pause
