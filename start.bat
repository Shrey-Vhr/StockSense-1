@echo off
echo Starting StockSense...

start cmd /k "cd F:\StockSense\backend && venv\Scripts\activate && python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"

ping 127.0.0.1 -n 6 > nul

start cmd /k "cd F:\StockSense\frontend && npm run dev"

ping 127.0.0.1 -n 9 > nul

start chrome http://localhost:5173

echo StockSense is running!