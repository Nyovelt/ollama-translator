# 🐳 Docker Deployment Guide

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Start the full stack (App + Ollama)
docker-compose up -d

# Access the application
open http://localhost:3000
```

### Option 2: Standalone Container

```bash
# Build the image
docker build -t ollama-translator .

# Run the container
docker run -p 3000:3000 ollama-translator
```

## Available Services

### 🌐 Web Application

- **Port**: 3000
- **URL**: http://localhost:3000
- **Image**: `ollama-translator:latest`

### 🤖 Ollama Service

- **Port**: 11434
- **URL**: http://localhost:11434
- **Image**: `ollama/ollama:latest`

### 🔒 Nginx Proxy (Production)

- **Port**: 80, 443
- **Profile**: `production`
- **Features**: SSL, Rate limiting, Caching

## Docker Compose Commands

```bash
# Start all services
docker-compose up -d

# Start specific services
docker-compose up -d ollama-translator ollama

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Update and rebuild
docker-compose build --no-cache
docker-compose up -d

# Production deployment with Nginx
docker-compose --profile production up -d
```

## Environment Configuration

### Docker Environment Variables

```bash
# Docker Compose environment
NEXT_PUBLIC_DEFAULT_API_URL=http://ollama:11434
NEXT_PUBLIC_DEFAULT_MODEL=llama3.1
NEXT_PUBLIC_DEFAULT_CONFIG_ID=ollama-default
NODE_ENV=production

# Custom configuration example
NEXT_PUBLIC_CUSTOM_LLM_NAME=Custom LLM
NEXT_PUBLIC_CUSTOM_API_URL=http://custom-api:8080
NEXT_PUBLIC_CUSTOM_MODEL=custom-model
NEXT_PUBLIC_CUSTOM_API_KEY=your_api_key
```

### Environment File Deployment

```bash
# Deploy with specific configuration
docker-compose --env-file .env.openai up -d

# Deploy with custom environment
echo "NEXT_PUBLIC_CUSTOM_LLM_NAME=My LLM" > .env.custom
echo "NEXT_PUBLIC_CUSTOM_API_URL=http://my-api:8080" >> .env.custom
echo "NEXT_PUBLIC_CUSTOM_MODEL=my-model" >> .env.custom
docker-compose --env-file .env.custom up -d
```

### Custom Configuration

Create a `.env` file:

```env
NEXT_PUBLIC_DEFAULT_API_URL=http://localhost:11434
NEXT_PUBLIC_DEFAULT_MODEL=llama3.1
NEXT_PUBLIC_DEFAULT_API_KEY=your_api_key_here
```

## Volume Management

### Persistent Data

- **ollama-data**: Stores downloaded models and configuration
- **Location**: `/root/.ollama` inside container

### Backup Models

```bash
# Backup Ollama models
docker-compose exec ollama tar -czf /tmp/ollama-backup.tar.gz /root/.ollama
docker cp $(docker-compose ps -q ollama):/tmp/ollama-backup.tar.gz ./ollama-backup.tar.gz

# Restore models
docker cp ./ollama-backup.tar.gz $(docker-compose ps -q ollama):/tmp/
docker-compose exec ollama tar -xzf /tmp/ollama-backup.tar.gz -C /
```

## Model Management

### Download Models

```bash
# Download specific model
docker-compose exec ollama ollama pull llama3.1

# List available models
docker-compose exec ollama ollama list

# Remove model
docker-compose exec ollama ollama rm <model-name>
```

### GPU Support

Add GPU support to docker-compose.yml:

```yaml
services:
  ollama:
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

## Production Deployment

### SSL Configuration

1. Place SSL certificates in `./ssl/` directory
2. Update `nginx.conf` with your domain
3. Start with production profile:

```bash
docker-compose --profile production up -d
```

### Performance Optimization

- Use Docker BuildKit for faster builds
- Configure resource limits in docker-compose.yml
- Monitor with docker stats

### Security Best Practices

- Run containers as non-root user ✅
- Use multi-stage builds ✅
- Implement health checks ✅
- Configure proper firewall rules
- Regular security updates

## Troubleshooting

### Common Issues

**Container won't start**

```bash
# Check logs
docker-compose logs ollama-translator

# Check health
docker-compose ps
```

**Ollama connection failed**

```bash
# Verify Ollama is running
docker-compose ps ollama

# Check Ollama logs
docker-compose logs ollama

# Test connection
curl http://localhost:11434/api/version
```

**Build failures**

```bash
# Clean build
docker-compose build --no-cache

# Remove old images
docker system prune -a
```

### Performance Issues

- **Slow inference**: Consider using smaller models or GPU acceleration
- **Memory usage**: Monitor with `docker stats`
- **Network latency**: Use internal Docker networking

## Utility Scripts

### Build Script

```bash
./scripts/build.sh
```

### Deployment Script

```bash
./scripts/deploy.sh
```

## Monitoring

### Health Checks

- **Application**: `/` endpoint
- **Ollama**: `/api/version` endpoint
- **Automatic**: Docker health checks every 30s

### Logging

```bash
# Follow logs
docker-compose logs -f

# Export logs
docker-compose logs > deployment.log

# Structured logging with timestamps
docker-compose logs -t --since="1h"
```

## Development Mode

### Hot Reload Development

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up

# Access with hot reload
open http://localhost:3000
```

### Debug Mode

```bash
# Run with shell access
docker run -it --rm ollama-translator sh

# Exec into running container
docker-compose exec ollama-translator sh
```
