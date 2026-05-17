#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -d "venv" ]; then
    echo "[run.sh] Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

if [ ! -f "venv/.requirements-installed" ] || [ "requirements.txt" -nt "venv/.requirements-installed" ]; then
    echo "[run.sh] Installing dependencies..."
    pip install -r requirements.txt -q
    touch venv/.requirements-installed
fi

echo "[run.sh] Starting NEON PAW API..."
uvicorn app.main:app --reload --port 8000
