#!/bin/bash
set -e

cd /home/user/Versi

echo "=== Starting dev servers ==="

# Start versi.fr dev server
cd /home/user/Versi/src
npx vite --port 5173 --host &
VERSI_PID=$!

# Start versi-immobilier dev server
cd /home/user/Versi/versi-immobilier
npx vite --port 5174 --host &
IMMO_PID=$!

echo "Versi.fr PID: $VERSI_PID"
echo "Versi-immobilier PID: $IMMO_PID"

echo "Waiting for servers to start..."
sleep 8

# Check if ports are listening
if ! curl -s http://localhost:5173 > /dev/null; then
  echo "WARNING: versi.fr server not responding on port 5173"
fi

if ! curl -s http://localhost:5174 > /dev/null; then
  echo "WARNING: versi-immobilier server not responding on port 5174"
fi

echo "Running Playwright screenshot script..."
cd /home/user/Versi
node scripts/visual-audit.js

echo "Killing dev servers..."
kill $VERSI_PID $IMMO_PID 2>/dev/null || true

echo "Done."
