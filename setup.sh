#!/bin/bash
set -e

echo "🚀 Starting SecureVault Initial Environment Setup..."

# 1. Check for dependencies
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed."
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "❌ Error: Docker Compose is not installed or not working."
    exit 1
fi
echo "✅ Docker & Docker Compose found."

# 2. Configure Environment Options
if [ ! -f .env ]; then
    echo "⚙️ Copying .env.example to .env..."
    cp .env.example .env
else
    echo "✅ .env file already exists."
fi

# 3. Create necessary persistent data directories
echo "📁 Setting up persistent data directories..."
mkdir -p ./data/postgres
mkdir -p ./data/minio
chmod -R 777 ./data

# 4. Build Containers
echo "🏗️ Building Docker containers..."
docker compose build

# 5. Start Containers
echo "🟢 Starting Docker containers in detached mode..."
docker compose up -d

echo ""
echo "🎉 Setup Complete! The Secure Evidence Vault is online."
echo ""
echo "--- Application Services ---"
echo "🖥️  Frontend UI:   http://localhost:3000"
echo "⚙️  Backend API:   http://localhost:8000/docs (Swagger)"
echo "🗄️  MinIO Console: http://localhost:9001"
echo "----------------------------"
echo "Happy Hacking! ✨"
