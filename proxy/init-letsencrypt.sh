#!/bin/bash
# ══════════════════════════════════════
# Initialize Let's Encrypt certificates
# Run once on first deployment
# ══════════════════════════════════════

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <domain> [email]"
    echo "Example: $0 quizhub.example.com admin@example.com"
    exit 1
fi

DOMAIN=$1
EMAIL=${2:-"admin@$DOMAIN"}

echo "🔐 Initializing Let's Encrypt for: $DOMAIN"
echo "   Email: $EMAIL"
echo ""

# 1. Set domain in .env
if grep -q "^DOMAIN=" .env 2>/dev/null; then
    sed -i "s/^DOMAIN=.*/DOMAIN=$DOMAIN/" .env
else
    echo "DOMAIN=$DOMAIN" >> .env
fi

# 2. Start nginx with HTTP-only (for ACME challenge)
echo "📦 Starting services..."
docker compose --profile prod up -d db api client

# 3. Create temporary nginx config for initial cert
docker compose --profile prod run --rm proxy sh -c "
    echo 'server { listen 80; server_name $DOMAIN; location /.well-known/acme-challenge/ { root /var/www/certbot; } location / { return 200 \"waiting for cert\"; } }' > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'
" &
sleep 5

# 4. Request certificate
echo "📜 Requesting certificate..."
docker compose --profile prod run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"

# 5. Restart everything with full HTTPS config
echo "🔄 Restarting with HTTPS..."
docker compose --profile prod down
docker compose --profile prod up -d

echo ""
echo "✅ HTTPS is now active!"
echo "   https://$DOMAIN"
echo ""
echo "📋 Certificate will auto-renew via certbot container."
