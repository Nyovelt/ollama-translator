# Ollama Translator

A modern web-based translator with a Google Translate-like interface that supports custom LLM backends, primarily designed for Ollama but compatible with OpenAI and other LLM APIs.

## Features

- 🌐 **Google Translate-like Interface**: Clean, intuitive UI for seamless translation
- 🔧 **Custom LLM Backends**: Configure multiple LLM providers (Ollama, OpenAI, etc.)
- 🔄 **Language Swapping**: Easy language pair switching
- 📋 **Copy & Audio**: Copy translations and text-to-speech functionality
- ⚙️ **Persistent Settings**: Your configurations are saved locally
- 🚀 **Real-time Translation**: Fast, responsive translation experience

## Supported LLM Providers

- **Ollama** (Primary): Local LLM inference
- **OpenAI**: GPT models via API
- **Generic APIs**: Any OpenAI-compatible API endpoint

## Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Ollama installed and running (for local inference)

### Installation

1. **Clone and setup:**

   ```bash
   git clone <your-repo-url>
   cd ollama-translator
   npm install
   ```

2. **Configure environment (optional):**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your default settings
   ```

3. **Start development server:**

   ```bash
   npm run dev
   ```

4. **Open browser:**
   Navigate to `http://localhost:3000`

## Configuration

### Default Setup

The application comes with default configurations for:

- **Ollama (Local)**: `http://localhost:11434` with `llama3.1` model
- **OpenAI**: `https://api.openai.com/v1` with `gpt-3.5-turbo` model

You can customize the default configuration through environment variables:

#### Environment-based Configuration

```bash
# Set default Ollama configuration
NEXT_PUBLIC_DEFAULT_API_URL=http://localhost:11434
NEXT_PUBLIC_DEFAULT_MODEL=llama3.1
NEXT_PUBLIC_DEFAULT_CONFIG_ID=ollama-default

# Or create a completely custom default
NEXT_PUBLIC_CUSTOM_LLM_NAME=My Custom LLM
NEXT_PUBLIC_CUSTOM_API_URL=http://my-llm-server:8080
NEXT_PUBLIC_CUSTOM_MODEL=my-model-name
NEXT_PUBLIC_CUSTOM_API_KEY=optional_api_key
```

#### Pre-configured Environment Files

The project includes several example configurations:

- `.env.production` - Standard Ollama setup
- `.env.openai` - OpenAI as default
- `.env.groq` - Groq as default

To use a specific configuration:

```bash
cp .env.groq .env.local
npm run dev
```

### Adding Custom LLM Backends

1. Click the **Settings** button in the top-right corner
2. Click **Add** to create a new configuration
3. Fill in the required fields:
   - **Name**: Display name for your configuration
   - **API URL**: The base URL of your LLM API
   - **Model**: Model name to use
   - **API Key**: Optional, required for some services

### Supported API Formats

The translator automatically detects and supports:

#### Ollama API Format

```javascript
{
  "model": "llama3.1",
  "prompt": "Your translation prompt",
  "stream": false
}
```

#### OpenAI API Format

```javascript
{
  "model": "gpt-3.5-turbo",
  "messages": [{"role": "user", "content": "Your prompt"}],
  "temperature": 0.3
}
```

### Examples of Compatible Services

- **Local Ollama**: `http://localhost:11434`
- **OpenAI**: `https://api.openai.com/v1` (requires API key)
- **Together AI**: `https://api.together.xyz/v1` (requires API key)
- **Groq**: `https://api.groq.com/openai/v1` (requires API key)
- **Local LM Studio**: `http://localhost:1234/v1`
- **Custom APIs**: Any OpenAI-compatible endpoint

## Usage

1. **Select Languages**: Choose source and target languages from the dropdowns
2. **Enter Text**: Type or paste text in the left textarea
3. **Translate**: Click the "Translate" button or press Ctrl/Cmd+Enter
4. **Copy/Listen**: Use the copy and audio buttons to interact with results
5. **Swap Languages**: Click the swap button to reverse translation direction

## Development

### Project Structure

```
src/
├── app/
│   ├── api/translate/route.ts    # Translation API endpoint
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles
├── components/
│   ├── TranslatorInterface.tsx   # Main translator UI
│   └── ConfigPanel.tsx           # Configuration modal
└── types/
    └── translator.ts             # TypeScript definitions
```

### Key Technologies

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type safety and better DX
- **Tailwind CSS**: Utility-first styling
- **React Icons**: Icon components

### API Integration

The translation API (`/api/translate`) handles multiple LLM formats:

- Detects API type based on URL patterns
- Falls back to multiple formats for maximum compatibility
- Provides detailed error messages for debugging

## Deployment

## Deployment

### Local Production Build

```bash
npm run build
npm start
```

### Docker Deployment

#### Quick Start with Docker Compose

```bash
# Clone and navigate to project
git clone <your-repo-url>
cd ollama-translator

# Start with Docker Compose (includes Ollama)
docker-compose up -d

# Access the application
open http://localhost:3000
```

#### Manual Docker Build

```bash
# Build the image
docker build -t ollama-translator .

# Run the container
docker run -p 3000:3000
  -e NEXT_PUBLIC_DEFAULT_API_URL=http://localhost:11434
  -e NEXT_PUBLIC_DEFAULT_MODEL=llama3.1
  ollama-translator
```

#### Development with Docker

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up

# Or use the build script
./scripts/build.sh
```

#### Production Deployment

```bash
# Full production setup with Nginx
docker-compose --profile production up -d

# Or use the deployment script
./scripts/deploy.sh
```

### Deploy to Vercel

```bash
npx vercel --prod
```

## Environment Variables

| Variable                        | Description                    | Default                  |
| ------------------------------- | ------------------------------ | ------------------------ |
| `NEXT_PUBLIC_DEFAULT_API_URL`   | Default LLM API URL            | `http://localhost:11434` |
| `NEXT_PUBLIC_DEFAULT_MODEL`     | Default model name             | `llama3.1`               |
| `NEXT_PUBLIC_DEFAULT_API_KEY`   | Default API key                | None                     |
| `NEXT_PUBLIC_DEFAULT_CONFIG_ID` | Which config to use as default | `ollama-default`         |
| `NEXT_PUBLIC_CUSTOM_LLM_NAME`   | Custom LLM display name        | None                     |
| `NEXT_PUBLIC_CUSTOM_API_URL`    | Custom LLM API URL             | None                     |
| `NEXT_PUBLIC_CUSTOM_MODEL`      | Custom LLM model name          | None                     |
| `NEXT_PUBLIC_CUSTOM_API_KEY`    | Custom LLM API key             | None                     |

### Configuration Priority

1. **Custom Configuration**: If all `NEXT_PUBLIC_CUSTOM_*` variables are set, this becomes the default
2. **Selected Default**: Use `NEXT_PUBLIC_DEFAULT_CONFIG_ID` to choose between built-in configs
3. **Fallback**: Falls back to Ollama configuration

## GitHub Actions & CI/CD

This project includes comprehensive GitHub Actions workflows for automated building, testing, and deployment.

### Available Workflows

#### 🐳 **Docker Build** (`.github/workflows/docker-build.yml`)

- Builds production Docker images on main branch pushes and releases
- Pushes to GitHub Container Registry (ghcr.io)
- Supports multi-platform builds (amd64, arm64)
- Automatic tagging based on git refs

### Using Docker Images from GitHub Container Registry

```bash
# Pull latest production image
docker pull ghcr.io/nyovelt/ollama-translator:latest

# Run with Ollama
docker run -p 3000:3000
  -e NEXT_PUBLIC_DEFAULT_API_URL=http://localhost:11434
  -e NEXT_PUBLIC_DEFAULT_MODEL=llama3.1
  ghcr.io/nyovelt/ollama-translator:latest

```

### Setting Up for Your Repository

1. **Enable GitHub Packages**: Ensure your repository has package publishing enabled
2. **Repository Secrets**: No additional secrets needed - uses `GITHUB_TOKEN`
3. **Branch Protection**: Consider protecting `main` branch to require PR reviews

### Manual Builds

You can trigger builds manually:

```bash
# Trigger a development build
git push origin feature/your-feature-name

# Create a release
git tag v1.0.0
git push origin v1.0.0
```

## Docker Configuration

### Available Images

- **Production**: `ollama-translator:latest` - Optimized production build
- **Development**: `ollama-translator:dev` - Development with hot reload

### Docker Compose Services

- **ollama-translator**: Main web application
- **ollama**: Local Ollama service for LLM inference
- **nginx**: Reverse proxy with SSL support (production profile)

### Docker Environment Variables

```bash
# Docker Compose environment
NEXT_PUBLIC_DEFAULT_API_URL=http://ollama:11434
NEXT_PUBLIC_DEFAULT_MODEL=llama3.1
NODE_ENV=production
```

### Volume Mounts

- `ollama-data`: Persistent storage for Ollama models
- `./ssl`: SSL certificates for HTTPS (production)

### Useful Docker Commands

```bash
# View logs
docker-compose logs -f ollama-translator

# Restart services
docker-compose restart

# Update Ollama models
docker-compose exec ollama ollama pull llama3.1

# Access Ollama shell
docker-compose exec ollama bash

# Clean up
docker-compose down -v
```

## Troubleshooting

### Common Issues

**Ollama Connection Failed**

- Ensure Ollama is running: `ollama serve`
- Check if model is available: `ollama list`
- Verify URL: `http://localhost:11434`

**CORS Errors**

- Ollama should handle CORS automatically
- For other APIs, check their CORS settings

**Translation Quality**

- Try different models (llama3.1, qwen2, etc.)
- Adjust the prompt in the API route if needed
- Some models work better for specific language pairs

**Performance Issues**

- Use smaller models for faster inference
- Consider GPU acceleration for Ollama
- Optimize model parameters in the API call

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test them
4. Commit: `git commit -m "Add feature-name"`
5. Push: `git push origin feature-name`
6. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Built with Next.js and Tailwind CSS
- Inspired by Google Translate's interface
- Powered by Ollama and other LLM providers
