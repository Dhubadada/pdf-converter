#!/bin/bash

echo ""
echo "╔══════════════════════════════════════╗"
echo "║        PDFCraft Pro v2.0             ║"
echo "║   Free PDF Converter - Node.js       ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed."
    echo "Install it from: https://nodejs.org"
    exit 1
fi
echo "[OK] Node.js $(node --version)"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo ""
    echo "[INFO] Installing dependencies (first run)..."
    npm install
    echo "[OK] Done!"
fi

# Check LibreOffice
if command -v libreoffice &> /dev/null || command -v soffice &> /dev/null; then
    echo "[OK] LibreOffice found"
else
    echo "[WARN] LibreOffice not found — Word/PPT conversion won't work"
    echo "       Install: sudo apt-get install libreoffice  (Ubuntu)"
    echo "       Install: brew install --cask libreoffice  (Mac)"
fi

# Create dirs
mkdir -p uploads outputs

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Starting server at http://localhost:3000"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Open browser (best effort)
if command -v xdg-open &> /dev/null; then
    (sleep 2 && xdg-open http://localhost:3000) &
elif command -v open &> /dev/null; then
    (sleep 2 && open http://localhost:3000) &
fi

node server.js
