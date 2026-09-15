#!/bin/bash
set -eo pipefail

echo "====================================================="
echo "  SecureVault Phase 7: Component 6 Test Harness       "
echo "  FastAPI Async Pipeline Orchestrator Tests           "
echo "====================================================="

# Ensure working directory is project root
cd "$(dirname "$0")/.."

# Rebuild engine container with FastAPI and uvicorn
echo "[1/2] Building / updating SecureVault Engine container..."
docker compose build engine

# Execute Component 6 integration test suite
echo "[2/2] Executing API integration tests..."
docker compose run --rm engine pytest tests/test_api_integration.py -v -s

echo ""
echo "====================================================="
echo "  COMPONENT 6 TESTS PASSED -- PHASE 7 GATE CLEARED   "
echo "====================================================="
