#!/usr/bin/env bash
set -e

# SecureVault Phase 2 Verification Runner
# Component 1: Cryptographic Envelope & Storage Engine Test Harness

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}  SecureVault Phase 2: Component 1 Test Harness       ${NC}"
echo -e "${BLUE}  Cryptographic Envelope & MinIO S3 Storage Engine    ${NC}"
echo -e "${BLUE}=====================================================${NC}"

# 1. Ensure MinIO is up and healthy
echo -n "[1/3] Checking MinIO health status... "
MINIO_STATUS=$(docker inspect --format='{{json .State.Health.Status}}' securevault_minio 2>/dev/null || echo "\"not_found\"")
if [ "$MINIO_STATUS" != "\"healthy\"" ]; then
    echo -e "${YELLOW}Starting infrastructure stack...${NC}"
    docker compose up -d minio minio-init postgres
    sleep 3
fi
echo -e "${GREEN}MINIO READY${NC}"

# 2. Build Engine Image if needed
echo -e "${BLUE}[2/3] Building / verifying SecureVault Engine container...${NC}"
docker compose build engine

# 3. Execute Pytest inside isolated container
echo -e "\n${BLUE}[3/3] Executing isolated cryptographic & storage tests...${NC}"
docker compose run --rm engine pytest tests/test_crypto_envelope.py -v -s

echo -e "\n${GREEN}=====================================================${NC}"
echo -e "${GREEN}  COMPONENT 1 TESTS PASSED -- PHASE 2 GATE CLEARED   ${NC}"
echo -e "${GREEN}=====================================================${NC}"
exit 0
