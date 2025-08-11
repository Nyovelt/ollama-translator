#!/bin/bash

# Ollama Translator Docker Build Script

set -e

echo "🐳 Building Ollama Translator Docker Images..."

# Build production image
echo "📦 Building production image..."
docker build -t ollama-translator:latest .

# Build development image
echo "📦 Building development image..."
docker build -f Dockerfile.dev -t ollama-translator:dev .

echo "✅ Build completed successfully!"

# Show images
echo "📋 Built images:"
docker images | grep ollama-translator

echo ""
echo "🚀 Quick start commands:"
echo "  Development: docker-compose -f docker-compose.dev.yml up"
echo "  Production:  docker-compose up"
echo "  With Ollama: docker-compose up ollama-translator ollama"
