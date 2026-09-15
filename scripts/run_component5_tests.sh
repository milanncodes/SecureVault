#!/bin/bash
set -eo pipefail

echo "====================================================="
echo "  SecureVault Phase 6: Component 5 Test Harness       "
echo "  Raster Redaction & Dynamic Watermarking Engine      "
echo "====================================================="

# Ensure working directory is project root
cd "$(dirname "$0")/.."

# Rebuild engine container with PyMuPDF
echo "[1/2] Building / updating SecureVault Engine container..."
docker compose build engine

# Execute Component 5 test suite
echo "[2/2] Executing isolated Redaction & Watermarking tests..."
docker compose run --rm engine pytest tests/test_sanitizer.py -v -s

echo ""
echo "====================================================="
echo "  COMPONENT 5 TESTS PASSED -- PHASE 6 GATE CLEARED   "
echo "====================================================="
