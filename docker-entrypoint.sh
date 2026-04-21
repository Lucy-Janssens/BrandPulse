#!/bin/sh
set -e

# Start API server in the background
echo "🚀 Starting BrandPulse API..."
cd /app/api
node server.js &

# Start frontend static server
echo "🌐 Serving BrandPulse dashboard..."
cd /app/frontend
serve -s dist -l 3000 &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
