'use strict';

const config = require('./config');

const LANGUAGE_NAMES = {
  auto: 'the detected language',
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  ar: 'Arabic',
  hi: 'Hindi',
  th: 'Thai',
  vi: 'Vietnamese',
};

function languageName(code) {
  return LANGUAGE_NAMES[code] || code;
}

// Custom error so the queue can distinguish retryable failures.
class UpstreamError extends Error {
  constructor(message, { status = 0, retryable = false } = {}) {
    super(message);
    this.name = 'UpstreamError';
    this.status = status;
    this.retryable = retryable;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Split text into chunks that fit the per-chunk character budget, preferring
// paragraph, then sentence, then word, then hard-cut boundaries.
function chunkText(text, budget) {
  if (text.length <= budget) return [text];

  const chunks = [];
  const paragraphs = text.split(/(\n{2,})/); // keep separators
  let current = '';

  const flush = () => {
    if (current.length) {
      chunks.push(current);
      current = '';
    }
  };

  const pushPiece = (piece) => {
    if ((current + piece).length <= budget) {
      current += piece;
    } else {
      flush();
      if (piece.length <= budget) {
        current = piece;
      } else {
        // Piece itself exceeds budget: split on sentence boundaries.
        const sentences = piece.split(/(?<=[.!?。！？\n])/);
        for (const s of sentences) {
          if (s.length > budget) {
            // Still too long: split on words, then hard-cut.
            const words = s.split(/(\s+)/);
            for (const w of words) {
              if (w.length > budget) {
                for (let i = 0; i < w.length; i += budget) {
                  pushPiece(w.slice(i, i + budget));
                }
              } else {
                pushPiece(w);
              }
            }
          } else {
            pushPiece(s);
          }
        }
      }
    }
  };

  for (const p of paragraphs) pushPiece(p);
  flush();
  return chunks.filter((c) => c.length > 0);
}

function buildMessages(text, sourceLang, targetLang) {
  const source =
    sourceLang === 'auto' ? 'the detected source language' : languageName(sourceLang);
  const target = languageName(targetLang);

  const system =
    'You are a professional translation engine. Translate the user message ' +
    `from ${source} into ${target}. Output ONLY the translated text with no ` +
    'explanations, notes, quotes, or the original text. Preserve meaning, ' +
    'tone, formatting and line breaks.';

  return [
    { role: 'system', content: system },
    { role: 'user', content: text },
  ];
}

// One upstream chat/completions call for a single chunk (no retries here).
async function callUpstreamOnce(text, sourceLang, targetLang, signal) {
  const url = `${config.apiBaseUrl}/v1/chat/completions`;
  const headers = { 'Content-Type': 'application/json' };
  if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      signal,
      body: JSON.stringify({
        model: config.model,
        messages: buildMessages(text, sourceLang, targetLang),
        temperature: 0,
        stream: false,
      }),
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new UpstreamError('Upstream request timed out', { retryable: true });
    }
    throw new UpstreamError(`Network error contacting upstream: ${err.message}`, {
      retryable: true,
    });
  }

  if (!res.ok) {
    const retryable = res.status === 429 || res.status >= 500;
    let detail = '';
    try {
      detail = (await res.text()).slice(0, 300);
    } catch (_) {
      /* ignore */
    }
    throw new UpstreamError(`Upstream HTTP ${res.status}: ${detail}`, {
      status: res.status,
      retryable,
    });
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new UpstreamError('Upstream returned no translation content', {
      retryable: false,
    });
  }
  return content.trim();
}

// Translate one chunk with timeout + retry/backoff. `onRateLimit` is called
// when a 429 is seen so the pool can adapt its concurrency.
async function translateChunk(text, sourceLang, targetLang, { onRateLimit, onAttempt } = {}) {
  let attempt = 0;
  // total tries = maxRetries + 1
  for (;;) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.requestTimeout);
    try {
      if (typeof onAttempt === 'function') onAttempt();
      return await callUpstreamOnce(text, sourceLang, targetLang, controller.signal);
    } catch (err) {
      const isRateLimit = err instanceof UpstreamError && err.status === 429;
      if (isRateLimit && typeof onRateLimit === 'function') onRateLimit();

      const retryable = err instanceof UpstreamError ? err.retryable : false;
      if (!retryable || attempt >= config.maxRetries) {
        throw err;
      }
      // Exponential backoff with jitter; give 429 an extra beat.
      const base = 500 * Math.pow(2, attempt);
      const jitter = Math.floor(base * 0.3 * (0.5 + pseudoRandom()));
      const wait = base + jitter + (isRateLimit ? 1000 : 0);
      attempt += 1;
      await sleep(wait);
    } finally {
      clearTimeout(timer);
    }
  }
}

// Deterministic-ish jitter without Math.random (kept simple; time-seeded).
let _seed = 1;
function pseudoRandom() {
  _seed = (_seed * 1103515245 + 12345) & 0x7fffffff;
  return (_seed % 1000) / 1000;
}

// Translate a full request, chunk by chunk (sequential to respect upstream
// concurrency limits), and re-join.
async function translateText(sourceText, sourceLang, targetLang, opts = {}) {
  const budget = config.chunkCharBudget;
  const chunks = chunkText(sourceText, budget);
  const out = [];
  for (const chunk of chunks) {
    // Preserve pure-whitespace separators verbatim (don't send to the model).
    if (chunk.trim() === '') {
      out.push(chunk);
      continue;
    }
    out.push(await translateChunk(chunk, sourceLang, targetLang, opts));
  }
  return out.join('');
}

module.exports = {
  translateText,
  chunkText,
  languageName,
  UpstreamError,
  countChunks: (text) => chunkText(text, config.chunkCharBudget).length,
};
