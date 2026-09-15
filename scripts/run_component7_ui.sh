#!/bin/bash
set -eo pipefail

echo "====================================================="
echo "  SecureVault Phase 8: Component 7 Frontend Harness   "
echo "  Matter-Centric Next.js Dashboard Deployment         "
echo "====================================================="

# Ensure working directory is project root
cd "$(dirname "$0")/.."

echo "[1/2] Building and launching Next.js frontend container..."
echo "Note: Frontend is building. It may take 60 seconds on the first run."
docker compose up -d --build frontend

echo "[2/2] Checking frontend container status..."
docker compose ps frontend

echo ""
echo "====================================================="
echo "  Access the Dashboard at http://localhost:3000      "
echo "====================================================="
