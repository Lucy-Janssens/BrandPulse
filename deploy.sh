#!/bin/bash
# BrandPulse AI - Local Network Deployment Script

echo "🚀 Deploying BrandPulse AI..."
echo ""

# Ensure we have the latest production compose file
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ Error: docker-compose.prod.yml not found in the current directory."
    echo "Please copy this file to your target deployment server alongside this script."
    exit 1
fi

echo "📦 Pulling latest image from GitHub Container Registry..."
docker pull ghcr.io/lucy-janssens/brandpulse:latest

echo "🔄 Restarting the application stack..."
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "✅ Deployment successful!"
echo "📡 The app is now running on Port 80."
echo "Access it by typing this computer's Local IP address into a browser on any other device on the network."
echo "You can find this IP address by running: 'ifconfig' (Mac/Linux) or 'ipconfig' (Windows)."
