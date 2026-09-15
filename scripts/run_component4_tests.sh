#!/bin/bash
set -eo pipefail

echo "====================================================="
echo "  SecureVault Phase 5: Component 4 Test Harness       "
echo "  Cryptographic Ledger & PKI Audit Engine             "
echo "====================================================="

# Ensure working directory is project root
cd "$(dirname "$0")/.."

# Execute Component 4 test suite inside engine container
echo "[1/1] Executing isolated Ledger & PKI tests..."
docker compose run --rm engine pytest tests/test_ledger.py -v -s

echo ""
echo "====================================================="
echo "  COMPONENT 4 TESTS PASSED -- PHASE 5 GATE CLEARED   "
echo "====================================================="
