import { NextRequest, NextResponse } from 'next/server';
import { TranslationRequest, TranslationResponse } from '@/types/translator';

export async function POST(request: NextRequest) {
  try {
    const body: TranslationRequest = await request.json();
    const { text, sourceLang, targetLang, config } = body;

    if (!text || !targetLang || !config) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Prepare the prompt for translation
    const sourceLanguage = sourceLang === 'auto' ? 'the detected language' : getLanguageName(sourceLang);
    const targetLanguage = getLanguageName(targetLang);
    
    const prompt = `Translate the following text from ${sourceLanguage} to ${targetLanguage}. Only return the translation, nothing else:

${text}`;

    // Determine the API format based on the URL
    let translatedText: string;
    
    if (config.apiUrl.includes('localhost:11434') || config.apiUrl.includes('ollama')) {
      // Ollama API format
      translatedText = await callOllamaAPI(config, prompt);
    } else if (config.apiUrl.includes('openai.com')) {
      // OpenAI API format
      translatedText = await callOpenAIAPI(config, prompt);
    } else {
      // Generic API format (assume OpenAI-compatible)
      translatedText = await callGenericAPI(config, prompt);
    }

    const response: TranslationResponse = {
      translatedText: translatedText.trim(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Translation failed' },
      { status: 500 }
    );
  }
}

async function callOllamaAPI(config: any, prompt: string): Promise<string> {
  const response = await fetch(`${config.apiUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.headers || {}),
    },
    body: JSON.stringify({
      model: config.model,
      prompt: prompt,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.response || '';
}

async function callOpenAIAPI(config: any, prompt: string): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(config.headers || {}),
  };

  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const response = await fetch(`${config.apiUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callGenericAPI(config: any, prompt: string): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(config.headers || {}),
  };

  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  // Try OpenAI format first
  try {
    const response = await fetch(`${config.apiUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    }
  } catch (error) {
    // Fall through to try other formats
  }

  // Try Ollama format
  try {
    const response = await fetch(`${config.apiUrl}/api/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model,
        prompt: prompt,
        stream: false,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.response || '';
    }
  } catch (error) {
    // Fall through
  }

  throw new Error('Unable to connect to the LLM API with any known format');
}

function getLanguageName(code: string): string {
  const languages: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'th': 'Thai',
    'vi': 'Vietnamese',
  };
  
  return languages[code] || code;
}
