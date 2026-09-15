#!/usr/bin/env bash
set -e

# SecureVault Phase 1 Verification Script
# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}     SecureVault Phase 1: Infrastructure Verification ${NC}"
echo -e "${BLUE}=====================================================${NC}"

# 1. Verify Docker Daemon
echo -n "[1/5] Checking Docker daemon status... "
if docker info > /dev/null 2>&1; then
    echo -e "${GREEN}RUNNING${NC}"
else
    echo -e "${RED}FAILED: Docker daemon is not running or accessible.${NC}"
    echo -e "${YELLOW}Please ensure the Docker daemon is started: 'sudo systemctl start docker' and user has permissions.${NC}"
    exit 1
fi

# Load environment variables if .env exists
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

BUCKET_NAME=${MINIO_DEFAULT_BUCKET:-legal-documents-vault}

# 2. Wait and Check Postgres Health
echo -n "[2/5] Checking PostgreSQL container health... "
PG_STATUS=$(docker inspect --format='{{json .State.Health.Status}}' securevault_postgres 2>/dev/null || echo "\"not_found\"")
if [ "$PG_STATUS" == "\"healthy\"" ]; then
    echo -e "${GREEN}HEALTHY${NC}"
else
    echo -e "${YELLOW}Waiting for PostgreSQL to become healthy...${NC}"
    TIMEOUT=30
    ELAPSED=0
    while [ "$PG_STATUS" != "\"healthy\"" ] && [ $ELAPSED -lt $TIMEOUT ]; do
        sleep 2
        ELAPSED=$((ELAPSED + 2))
        PG_STATUS=$(docker inspect --format='{{json .State.Health.Status}}' securevault_postgres 2>/dev/null || echo "\"not_found\"")
    done
    if [ "$PG_STATUS" == "\"healthy\"" ]; then
        echo -e "${GREEN}PostgreSQL is HEALTHY (${ELAPSED}s)${NC}"
    else
        echo -e "${RED}FAILED: PostgreSQL status is ${PG_STATUS}${NC}"
        docker logs securevault_postgres --tail 20 2>/dev/null || true
        exit 1
    fi
fi

# 3. Wait and Check MinIO Health
echo -n "[3/5] Checking MinIO container health... "
MINIO_STATUS=$(docker inspect --format='{{json .State.Health.Status}}' securevault_minio 2>/dev/null || echo "\"not_found\"")
if [ "$MINIO_STATUS" == "\"healthy\"" ]; then
    echo -e "${GREEN}HEALTHY${NC}"
else
    echo -e "${YELLOW}Waiting for MinIO to become healthy...${NC}"
    TIMEOUT=30
    ELAPSED=0
    while [ "$MINIO_STATUS" != "\"healthy\"" ] && [ $ELAPSED -lt $TIMEOUT ]; do
        sleep 2
        ELAPSED=$((ELAPSED + 2))
        MINIO_STATUS=$(docker inspect --format='{{json .State.Health.Status}}' securevault_minio 2>/dev/null || echo "\"not_found\"")
    done
    if [ "$MINIO_STATUS" == "\"healthy\"" ]; then
        echo -e "${GREEN}MinIO is HEALTHY (${ELAPSED}s)${NC}"
    else
        echo -e "${RED}FAILED: MinIO status is ${MINIO_STATUS}${NC}"
        docker logs securevault_minio --tail 20 2>/dev/null || true
        exit 1
    fi
fi

# 4. Check MinIO Bucket Existence
echo -n "[4/5] Verifying default MinIO bucket '${BUCKET_NAME}'... "
# Discover network dynamically
MINIO_NET=$(docker inspect --format='{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}' securevault_minio 2>/dev/null || echo "securevault_legal-net")

BUCKET_CHECK=$(docker run --rm --network "${MINIO_NET}" --entrypoint /bin/sh \
  -e MINIO_ROOT_USER="${MINIO_ROOT_USER:-minio_admin}" \
  -e MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-minio_secure_vault_2024}" \
  minio/mc:latest \
  -c "mc alias set testminio http://minio:9000 \$MINIO_ROOT_USER \$MINIO_ROOT_PASSWORD > /dev/null 2>&1 && mc ls testminio" 2>/dev/null | grep -c "${BUCKET_NAME}" || true)

if [ "${BUCKET_CHECK:-0}" -ge 1 ]; then
    echo -e "${GREEN}EXISTS & ACCESSIBLE (${BUCKET_NAME})${NC}"
else
    echo -e "${RED}FAILED: Bucket '${BUCKET_NAME}' not found.${NC}"
    exit 1
fi

# 5. Check Resource Consumption (docker stats)
echo -e "\n${BLUE}[5/5] Checking container resource utilization:${NC}"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}" securevault_postgres securevault_minio

echo -e "\n${GREEN}=====================================================${NC}"
echo -e "${GREEN}   PHASE 1 VERIFICATION SUCCESSFUL - ALL GATES PASS  ${NC}"
echo -e "${GREEN}=====================================================${NC}"
exit 0
