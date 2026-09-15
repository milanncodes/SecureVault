#!/bin/bash
set -eo pipefail

echo "====================================================="
echo "  SecureVault Phase 3: Component 2 Test Harness       "
echo "  Relational Schema & ABAC Engine                     "
echo "====================================================="

# Ensure working directory is project root
cd "$(dirname "$0")/.."

# Check PostgreSQL health
echo -n "[1/3] Checking PostgreSQL health status... "
PG_STATUS=$(docker compose ps postgres --format "{{.Health}}")
if [[ "$PG_STATUS" != *"healthy"* ]]; then
    echo "WAITING (current: $PG_STATUS)"
    docker compose up -d postgres
    for i in {1..30}; do
        if [[ $(docker compose ps postgres --format "{{.Health}}") == *"healthy"* ]]; then
            break
        fi
        sleep 1
    done
fi
echo "POSTGRES READY"

# Build engine container with new database dependencies
echo "[2/3] Building / updating SecureVault Engine container..."
docker compose build engine

# Execute ABAC & Schema tests inside isolated engine container
echo "[3/3] Executing isolated ABAC & Relational Schema tests..."
docker compose run --rm engine pytest tests/test_abac_engine.py -v -s

echo ""
echo "====================================================="
echo "  COMPONENT 2 TESTS PASSED -- PHASE 3 GATE CLEARED   "
echo "====================================================="
