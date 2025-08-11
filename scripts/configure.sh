#!/bin/bash

# Ollama Translator Configuration Deployment Script

set -e

echo "🔧 Ollama Translator Configuration Deployment"
echo ""

# Function to deploy with specific configuration
deploy_with_config() {
    local config_name=$1
    local env_file=$2
    
    echo "📋 Deploying with $config_name configuration..."
    
    if [ -f "$env_file" ]; then
        # Copy the environment file
        cp "$env_file" .env.local
        echo "✅ Environment file copied: $env_file -> .env.local"
        
        # Show the configuration
        echo "📊 Current configuration:"
        echo "----------------------------------------"
        grep -E "^[^#]" "$env_file" || echo "No environment variables set"
        echo "----------------------------------------"
        
        # Build and start
        echo "🏗️  Building application..."
        npm run build
        
        echo "🚀 Starting application..."
        npm start &
        
        echo "✅ Application started with $config_name configuration"
        echo "🌐 Access at: http://localhost:3000"
        echo ""
        echo "Press Ctrl+C to stop the server"
        wait
    else
        echo "❌ Environment file not found: $env_file"
        echo "Available configurations:"
        ls -1 .env.* 2>/dev/null || echo "No environment files found"
    fi
}

# Function to show available configurations
show_configs() {
    echo "📋 Available configurations:"
    echo ""
    
    if [ -f ".env.example" ]; then
        echo "🔧 .env.example - Template with all options"
    fi
    
    if [ -f ".env.production" ]; then
        echo "🏭 .env.production - Standard Ollama setup"
    fi
    
    if [ -f ".env.openai" ]; then
        echo "🤖 .env.openai - OpenAI GPT as default"
    fi
    
    if [ -f ".env.groq" ]; then
        echo "⚡ .env.groq - Groq Lightning as default"
    fi
    
    echo ""
    echo "Custom configurations can be created by copying .env.example"
}

# Main script logic
case "${1:-}" in
    "ollama"|"production")
        deploy_with_config "Ollama" ".env.production"
        ;;
    "openai")
        deploy_with_config "OpenAI" ".env.openai"
        ;;
    "groq")
        deploy_with_config "Groq" ".env.groq"
        ;;
    "list"|"configs")
        show_configs
        ;;
    "help"|"--help"|"-h")
        echo "Usage: $0 [configuration]"
        echo ""
        echo "Configurations:"
        echo "  ollama      Deploy with Ollama configuration (default)"
        echo "  openai      Deploy with OpenAI configuration"
        echo "  groq        Deploy with Groq configuration"
        echo "  list        Show available configurations"
        echo "  help        Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 ollama   # Deploy with Ollama"
        echo "  $0 openai   # Deploy with OpenAI"
        echo "  $0 list     # Show available configs"
        ;;
    "")
        echo "🚀 Quick start with default Ollama configuration"
        deploy_with_config "Ollama (default)" ".env.production"
        ;;
    *)
        echo "❌ Unknown configuration: $1"
        echo "Run '$0 help' for usage information"
        exit 1
        ;;
esac
