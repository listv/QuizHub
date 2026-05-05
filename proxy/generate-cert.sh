#!/bin/bash
# ══════════════════════════════════════
# Generate self-signed certificate for local development
# ══════════════════════════════════════

CERTS_DIR="$(dirname "$0")/certs"
mkdir -p "$CERTS_DIR"

if [ -f "$CERTS_DIR/server.crt" ] && [ -f "$CERTS_DIR/server.key" ]; then
    echo "✅ Certificates already exist in $CERTS_DIR"
    echo "   Delete them and re-run to regenerate."
    exit 0
fi

echo "🔐 Generating self-signed certificate..."

openssl req -x509 -nodes -days 365 \
    -newkey rsa:2048 \
    -keyout "$CERTS_DIR/server.key" \
    -out "$CERTS_DIR/server.crt" \
    -subj "/C=UA/ST=Dev/L=Local/O=QuizHub/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1"

if [ $? -eq 0 ]; then
    echo "✅ Certificate generated successfully!"
    echo "   cert: $CERTS_DIR/server.crt"
    echo "   key:  $CERTS_DIR/server.key"
    echo ""
    echo "⚠️  This is a self-signed certificate."
    echo "   Your browser will show a security warning — this is expected."
    echo "   Click 'Advanced' → 'Proceed to localhost' to continue."
else
    echo "❌ Failed to generate certificate."
    echo "   Make sure OpenSSL is installed."
    exit 1
fi
