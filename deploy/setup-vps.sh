#!/bin/bash
set -euo pipefail

SYNCRA_DIR="/var/www/Syncra"
BACKEND_DIR="$SYNCRA_DIR/backend"
FRONTEND_DIR="$SYNCRA_DIR/frontend"
UPLOADS_DIR="$SYNCRA_DIR/uploads"
LOGS_DIR="/var/log/syncra"

echo "=== Step 1: Install dependencies ==="
apt update
apt install -y nginx docker.io docker-compose-plugin

if ! command -v dotnet &>/dev/null; then
    echo "Installing .NET 8 runtime..."
    wget -q https://dot.net/v1/dotnet-install.sh -O /tmp/dotnet-install.sh
    chmod +x /tmp/dotnet-install.sh
    /tmp/dotnet-install.sh --channel 8.0 --install-dir /usr/share/dotnet
    ln -sf /usr/share/dotnet/dotnet /usr/bin/dotnet
fi

echo "=== Step 2: Create directories ==="
mkdir -p "$BACKEND_DIR" "$FRONTEND_DIR" "$UPLOADS_DIR" "$LOGS_DIR"

echo "=== Step 3: Start Redis ==="
cd "$SYNCRA_DIR"
cp "$(dirname "$0")/docker-compose.yml" "$SYNCRA_DIR/docker-compose.yml"
docker compose up -d redis

echo "=== Step 4: Setup nginx ==="
cp "$(dirname "$0")/nginx-syncra.conf" /etc/nginx/sites-available/syncra
if [ ! -L /etc/nginx/sites-enabled/syncra ]; then
    ln -sf /etc/nginx/sites-available/syncra /etc/nginx/sites-enabled/
fi
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl restart nginx

echo "=== Step 5: Setup systemd service ==="
cp "$(dirname "$0")/syncra-api.service" /etc/systemd/system/syncra-api.service
systemctl daemon-reload
systemctl enable syncra-api

echo "=== Step 6: Deploy appsettings ==="
cp "$(dirname "$0")/appsettings.Production.json" "$BACKEND_DIR/appsettings.Production.json"

echo ""
echo "=== Bootstrap complete! ==="
echo "System is ready. Push to main branch to trigger deploy via GitHub Actions."
echo "Or deploy manually:"
echo "  1. Build backend: dotnet publish -c Release -o $BACKEND_DIR"
echo "  2. Build frontend: cd fe && npm ci && npm run build && cp -r dist/* $FRONTEND_DIR/"
echo "  3. Start service: systemctl start syncra-api"
