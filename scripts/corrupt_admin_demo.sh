#!/usr/bin/env bash
# ==============================================================================
# SecureVault: Live Hackathon Corrupt DBA Tamper Demonstration Script
# Simulates a rogue Database Administrator directly altering raw PostgreSQL rows
# to bypass application security and attempt evidence tampering.
# ==============================================================================

set -euo pipefail

echo ""
echo "======================================================================"
echo "  🚨 SIMULATING CORRUPT DATABASE ADMINISTRATOR ATTACK 🚨              "
echo "======================================================================"
echo "[ATTACK VECTOR] Rogue DBA with root database access directly connects"
echo "                to PostgreSQL on port 5432, completely bypassing the"
echo "                FastAPI application layer and ABAC authorization."
echo ""

echo ">>> [1/3] Querying authentic document hash before tampering..."
docker compose exec -T postgres psql -U legal_admin -d legal_dms -c \
  "SELECT id, filename, file_hash FROM documents LIMIT 1;"

echo ""
echo ">>> [2/3] Executing rogue SQL UPDATE command to tamper with evidence record..."
docker compose exec -T postgres psql -U legal_admin -d legal_dms -c \
  "UPDATE documents SET file_hash = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' WHERE id = (SELECT id FROM documents LIMIT 1);"

echo ""
echo ">>> [3/3] Verifying altered database record:"
docker compose exec -T postgres psql -U legal_admin -d legal_dms -c \
  "SELECT id, filename, file_hash FROM documents LIMIT 1;"

echo ""
echo "======================================================================"
echo "  ⚠️  DATABASE RECORD ALTERED BYPASSING THE APPLICATION LAYER ⚠️      "
echo "======================================================================"
echo "Traditional centralized databases (and normal DMS systems) will now"
echo "falsely accept this tampered document because SQL state was changed."
echo ""
echo "HOWEVER, in SecureVault:"
echo "1. The RFC 6962 Merkle Tree Audit Ledger detects cryptographic mismatch."
echo "2. The Ed25519 PKI digital signature verification fails on doc_hash."
echo "3. The Next.js Officer Dashboard flags the broken Chain of Custody."
echo "4. The document cannot be admitted under Section 65B of BSA 2023."
echo "======================================================================"
echo ""
