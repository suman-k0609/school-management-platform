#!/usr/bin/env bash
# ==============================================================================
# Generate Self-Signed SSL/TLS Certificates for Nginx Reverse Proxy
# ==============================================================================
set -euo pipefail

CERT_DIR="${1:-./certs}"
DOMAIN="${2:-localhost}"

mkdir -p "$CERT_DIR"

CERT_PATH="$CERT_DIR/school-api.crt"
KEY_PATH="$CERT_DIR/school-api.key"

if [[ -f "$CERT_PATH" && -f "$KEY_PATH" ]]; then
    echo "[INFO] SSL certificates already exist in $CERT_DIR"
    exit 0
fi

echo "[INFO] Generating 2048-bit RSA TLS certificate for $DOMAIN..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$KEY_PATH" \
    -out "$CERT_PATH" \
    -subj "/CN=$DOMAIN/O=Algions AI Labs/OU=School Management/C=IN" \
    -addext "subjectAltName=DNS:localhost,DNS:127.0.0.1,IP:127.0.0.1"

chmod 600 "$KEY_PATH"
chmod 644 "$CERT_PATH"

echo "[SUCCESS] SSL Certificate created:"
echo "  Certificate: $CERT_PATH"
echo "  Private Key: $KEY_PATH"
