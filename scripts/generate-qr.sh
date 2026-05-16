#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: ./scripts/generate-qr.sh <LIVE_URL>"
  exit 1
fi

URL="$1"
OUT="${2:-qrcode.png}"

if command -v qrencode >/dev/null 2>&1; then
  qrencode -o "${OUT}" -s 8 "${URL}"
  echo "QR saved to ${OUT}"
else
  echo "qrencode is not installed."
  echo "Linux: sudo apt-get install qrencode"
  echo "macOS: brew install qrencode"
  echo "Windows (winget): winget install qrencode.qrencode"
  exit 1
fi
