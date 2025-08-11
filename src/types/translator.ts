export interface LLMConfig {
  id: string;
  name: string;
  apiUrl: string;
  model: string;
  apiKey?: string;
  headers?: Record<string, string>;
}

export interface TranslationRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
  config: LLMConfig;
}

export interface TranslationResponse {
  translatedText: string;
  error?: string;
}

export interface Language {
  code: string;
  name: string;
}

export const DEFAULT_LANGUAGES: Language[] = [
  { code: 'auto', name: 'Detect language' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'th', name: 'Thai' },
  { code: 'vi', name: 'Vietnamese' },
];

export const DEFAULT_LLM_CONFIGS: LLMConfig[] = [
  {
    id: 'ollama-default',
    name: 'Ollama (Local)',
    apiUrl: process.env.NEXT_PUBLIC_DEFAULT_API_URL || 'http://localhost:11434',
    model: process.env.NEXT_PUBLIC_DEFAULT_MODEL || 'llama3.1',
    apiKey: process.env.NEXT_PUBLIC_DEFAULT_API_KEY || undefined,
  },
  {
    id: 'openai',
    name: 'OpenAI GPT',
    apiUrl: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo',
  },
];

// Utility function to get the default configuration
export function getDefaultLLMConfig(): LLMConfig {
  const defaultId = process.env.NEXT_PUBLIC_DEFAULT_CONFIG_ID || 'ollama-default';
  const foundConfig = DEFAULT_LLM_CONFIGS.find(config => config.id === defaultId);
  
  if (foundConfig) {
    return foundConfig;
  }
  
  // If the specified default config is not found, return the first one
  return DEFAULT_LLM_CONFIGS[0];
}

// Utility function to create a custom default configuration from environment variables
export function createCustomDefaultConfig(): LLMConfig | null {
  const customName = process.env.NEXT_PUBLIC_CUSTOM_LLM_NAME;
  const customApiUrl = process.env.NEXT_PUBLIC_CUSTOM_API_URL;
  const customModel = process.env.NEXT_PUBLIC_CUSTOM_MODEL;
  
  if (customName && customApiUrl && customModel) {
    return {
      id: 'custom-default',
      name: customName,
      apiUrl: customApiUrl,
      model: customModel,
      apiKey: process.env.NEXT_PUBLIC_CUSTOM_API_KEY || undefined,
    };
  }
  
  return null;
}

// Get all available configurations including custom ones
export function getAllLLMConfigs(): LLMConfig[] {
  const configs = [...DEFAULT_LLM_CONFIGS];
  const customConfig = createCustomDefaultConfig();
  
  if (customConfig) {
    // Add custom config at the beginning to make it the default
    configs.unshift(customConfig);
  }
  
  return configs;
}
