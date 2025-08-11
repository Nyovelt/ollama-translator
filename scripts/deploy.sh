#!/bin/bash

# Ollama Translator Docker Deployment Script

set -e

echo "🚀 Deploying Ollama Translator..."

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down || true

# Pull latest Ollama image
echo "📥 Pulling latest Ollama image..."
docker pull ollama/ollama:latest

# Build application
echo "🔨 Building application..."
docker-compose build

# Start services
echo "▶️  Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check health
echo "🏥 Checking service health..."
docker-compose ps

# Show logs
echo "📜 Recent logs:"
docker-compose logs --tail=20

echo ""
echo "✅ Deployment completed!"
echo "🌐 Access the application at: http://localhost:3000"
echo "🤖 Ollama API available at: http://localhost:11434"
echo ""
echo "📊 Useful commands:"
echo "  View logs:    docker-compose logs -f"
echo "  Stop:         docker-compose down"
echo "  Restart:      docker-compose restart"
