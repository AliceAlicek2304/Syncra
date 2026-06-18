#!/bin/bash
set -euo pipefail

SYNCRA_DIR="/var/www/Syncra"
DEPLOY_DIR="$(dirname "$0")"
FRONTEND_DIR="$SYNCRA_DIR/frontend"
LOGS_DIR="/var/log/syncra"

echo "=== Step 1: Install dependencies ==="
apt update

if ! command -v nginx &>/dev/null; then
    apt install -y nginx
fi

if ! command -v docker &>/dev/null; then
    apt install -y docker.io docker-compose-plugin
fi

if ! docker compose version &>/dev/null 2>&1; then
    apt install -y docker-compose-plugin
fi

echo "=== Step 2: Enable Docker IPv6 ==="
DOCKER_CONFIG="/etc/docker/daemon.json"
if [ ! -f "$DOCKER_CONFIG" ] || ! grep -q "ipv6" "$DOCKER_CONFIG" 2>/dev/null; then
    mkdir -p /etc/docker
    cat > "$DOCKER_CONFIG" << 'EOF'
{
  "ipv6": true,
  "fixed-cidr-v6": "2001:db8:1::/64",
  "ip6tables": true
}
EOF
    echo "Docker daemon.json updated. Restarting Docker..."
    systemctl restart docker
else
    echo "Docker IPv6 already configured"
fi

echo "=== Step 3: Create directories ==="
mkdir -p "$FRONTEND_DIR" "$LOGS_DIR"
mkdir -p "$SYNCRA_DIR/deploy"

echo "=== Step 4: Setup nginx ==="
cp "$DEPLOY_DIR/nginx-syncra.conf" /etc/nginx/sites-available/syncra
if [ ! -L /etc/nginx/sites-enabled/syncra ]; then
    ln -sf /etc/nginx/sites-available/syncra /etc/nginx/sites-enabled/
fi
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl restart nginx

echo "=== Step 5: Install certbot for SSL ==="
if ! command -v certbot &>/dev/null; then
    apt install -y certbot python3-certbot-nginx
    echo "Certbot installed. Run: certbot --nginx -d syncra.vn -d www.syncra.vn"
else
    echo "Certbot already installed"
fi

echo "=== Step 6: Deploy Docker Compose ==="
cp "$DEPLOY_DIR/docker-compose.yml" "$SYNCRA_DIR/deploy/docker-compose.yml"
cd "$SYNCRA_DIR"

if [ -f ".env" ]; then
    echo "Found .env — starting services..."
    docker compose -f deploy/docker-compose.yml pull
    docker compose -f deploy/docker-compose.yml up -d
    echo "Services started. Check: curl https://syncra.vn/health"
else
    echo "No .env found. Create from template:"
    echo "  cp .env.production.template .env && nano .env"
    echo "Then run: docker compose -f deploy/docker-compose.yml up -d"
fi

echo ""
echo "=== Bootstrap complete! ==="
echo "Push to main branch to trigger auto-deploy via GitHub Actions."
echo "Manual deploy:"
echo "  1. Build frontend: cd fe && npm ci && npm run build"
echo "  2. Build image: docker build -f deploy/Dockerfile -t ghcr.io/tai-isme/syncra-api:latest ."
echo "  3. Push image: docker push ghcr.io/tai-isme/syncra-api:latest"
echo "  4. On VPS: docker compose -f deploy/docker-compose.yml pull backend && docker compose -f deploy/docker-compose.yml up -d --no-deps backend"
