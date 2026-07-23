@echo off
echo Starting StockSense...

:: Start backend (FastAPI + uvicorn)
start cmd /k "cd /d %~dp0backend && venv\Scripts\activate && python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"

:: Wait for backend to initialize
ping 127.0.0.1 -n 6 > nul

:: Start frontend (Vite dev server)
start cmd /k "cd /d %~dp0frontend && npm run dev"

:: Wait for frontend to initialize
ping 127.0.0.1 -n 9 > nul

:: Open in browser
start chrome http://localhost:5173

echo StockSense is running!