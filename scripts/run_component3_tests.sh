#!/bin/bash
set -eo pipefail

echo "====================================================="
echo "  SecureVault Phase 4: Component 3 Test Harness       "
echo "  Zero-Egress OCR & NER Extraction Engine             "
echo "====================================================="

# Ensure working directory is project root
cd "$(dirname "$0")/.."

# Rebuild engine container with Tesseract, Poppler, and SpaCy
echo "[1/2] Building / updating SecureVault Engine container..."
docker compose build engine

# Execute Component 3 test suite
echo "[2/2] Executing isolated OCR & NER tests..."
docker compose run --rm engine pytest tests/test_ai_extractor.py -v -s

echo ""
echo "====================================================="
echo "  COMPONENT 3 TESTS PASSED -- PHASE 4 GATE CLEARED   "
echo "====================================================="
