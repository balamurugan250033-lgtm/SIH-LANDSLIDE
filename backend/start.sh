#!/usr/bin/env bash
set -euo pipefail

# Install dependencies
pip install --no-cache-dir -r requirements.txt

# Start the FastAPI app with uvicorn, bound to all interfaces on Railway's default port
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
