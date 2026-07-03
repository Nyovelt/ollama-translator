'use strict';

// Central configuration read from environment variables.
// Secrets (the upstream API key) are read here only and never logged.

function intEnv(name, def) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return def;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : def;
}

function stripTrailingSlash(url) {
  return (url || '').replace(/\/+$/, '');
}

const config = {
  // Upstream (OpenAI-compatible) translation API
  apiBaseUrl: stripTrailingSlash(
    process.env.TRANSLATE_API_BASE_URL || 'https://gemma.aaaab3n.moe'
  ),
  apiKey: process.env.TRANSLATE_API_KEY || '',
  model: process.env.TRANSLATE_MODEL || 'gemma-4-E4B-it-qat-UD-Q4_K_XL.gguf',

  // Context window of the upstream model; used to derive chunk sizing.
  // Default 4096 = the reference upstream's real available context (verified).
  ctxSize: intEnv('TRANSLATE_CTX_SIZE', 4096),

  // Queue / concurrency tuning
  workerConcurrency: Math.max(1, intEnv('WORKER_CONCURRENCY', 8)),
  queueMaxSize: Math.max(1, intEnv('QUEUE_MAX_SIZE', 100)),
  requestTimeout: intEnv('REQUEST_TIMEOUT', 60000),
  maxRetries: Math.max(0, intEnv('MAX_RETRIES', 3)),

  // Server
  port: intEnv('PORT', 3000),
  dbPath: process.env.DB_PATH || '/data/translations.db',

  // Derived: characters per chunk. Reserve most of the ctx window for the
  // prompt + generated output (output length ~= input length), and be
  // conservative because CJK packs more tokens per character.
  get chunkCharBudget() {
    const raw = intEnv('CHUNK_CHAR_BUDGET', 0);
    if (raw > 0) return raw;
    return Math.max(1000, Math.floor(this.ctxSize / 4));
  },

  // Hard cap on how long the synchronous endpoint waits for a job.
  get clientWaitTimeout() {
    return intEnv('CLIENT_WAIT_TIMEOUT', 300000);
  },
};

// Redacted view for logging/health — never expose the key.
config.safeSummary = function safeSummary() {
  return {
    apiBaseUrl: config.apiBaseUrl,
    model: config.model,
    apiKeyConfigured: Boolean(config.apiKey),
    ctxSize: config.ctxSize,
    workerConcurrency: config.workerConcurrency,
    queueMaxSize: config.queueMaxSize,
    requestTimeout: config.requestTimeout,
    maxRetries: config.maxRetries,
    chunkCharBudget: config.chunkCharBudget,
    port: config.port,
    dbPath: config.dbPath,
  };
};

module.exports = config;
