#!/bin/bash

cd "$(dirname "$0")"

if ! command -v node &>/dev/null; then
    echo ""
    echo "  Node.js is not installed."
    echo "  Download it from https://nodejs.org (version 18 or later)."
    echo ""
    read -p "  Press Enter to exit..."
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo ""
    echo "  Installing dependencies (first run only)..."
    echo ""
    npm install
fi

echo ""
echo "  Starting PlotMate Storyboards..."
echo "  Open http://localhost:9107 in your browser."
echo ""
echo "  Press Ctrl+C to stop."
echo ""

npm run dev
