@echo off
cd /d "%~dp0"

if not exist "venv\Scripts\python.exe" (
    echo [run.bat] Creating virtual environment...
    python -m venv venv
)

echo [run.bat] Installing dependencies...
call venv\Scripts\pip install -r requirements.txt -q

echo [run.bat] Starting NEON PAW API...
call venv\Scripts\uvicorn app.main:app --reload --port 8000
