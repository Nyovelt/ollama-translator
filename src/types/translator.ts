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
    apiUrl: 'http://localhost:11434',
    model: 'llama3.1',
  },
  {
    id: 'openai',
    name: 'OpenAI GPT',
    apiUrl: 'https://api.openai.com/v1',
    model: 'gpt-3.5-turbo',
  },
];
