'use strict';

const path = require('path');
const crypto = require('crypto');
const express = require('express');

const config = require('./config');
const db = require('./db');
const queue = require('./queue');
const { countChunks, languageName } = require('./translate');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

const STATIC_DIR = path.join(__dirname, '..', 'out');
const MAX_TEXT_LENGTH = 50000;
const SUPPORTED_LANGS = new Set([
  'auto', 'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar',
  'hi', 'th', 'vi',
]);

function validate(body) {
  const text = typeof body.text === 'string' ? body.text : '';
  const sourceLang = body.sourceLang || 'auto';
  const targetLang = body.targetLang;

  if (!text.trim()) return { error: 'Field "text" is required' };
  if (text.length > MAX_TEXT_LENGTH) {
    return { error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters` };
  }
  if (!targetLang) return { error: 'Field "targetLang" is required' };
  if (!SUPPORTED_LANGS.has(sourceLang)) {
    return { error: `Unsupported sourceLang "${sourceLang}"` };
  }
  if (targetLang === 'auto' || !SUPPORTED_LANGS.has(targetLang)) {
    return { error: `Unsupported targetLang "${targetLang}"` };
  }
  return { text, sourceLang, targetLang };
}

// Create + persist + enqueue a job. Returns the job id or throws QueueFullError.
function submit({ text, sourceLang, targetLang }) {
  const id = crypto.randomUUID();
  const chunks = countChunks(text);
  db.insertJob({ id, sourceText: text, sourceLang, targetLang, chunks });
  try {
    queue.enqueue(id);
  } catch (err) {
    if (err instanceof queue.QueueFullError) {
      db.markError(id, 'Rejected: queue full');
    }
    throw err;
  }
  return id;
}

// --- Synchronous translate: submit + wait + return translation --------------
app.post('/api/translate', async (req, res) => {
  const v = validate(req.body || {});
  if (v.error) return res.status(400).json({ error: v.error });

  let id;
  try {
    id = submit(v);
  } catch (err) {
    if (err instanceof queue.QueueFullError) {
      res.set('Retry-After', '5');
      return res.status(429).json({ error: 'Server busy: translation queue is full' });
    }
    console.error('[api] submit failed:', err.message);
    return res.status(500).json({ error: 'Failed to enqueue translation' });
  }

  const outcome = await queue.waitFor(id);
  if (outcome.status === 'done') {
    return res.json({ id, translatedText: outcome.result });
  }
  if (outcome.status === 'timeout') {
    return res.status(504).json({ id, error: outcome.error });
  }
  return res.status(502).json({ id, error: outcome.error || 'Translation failed' });
});

// --- Async submit: returns a job id immediately -----------------------------
app.post('/api/translate/async', (req, res) => {
  const v = validate(req.body || {});
  if (v.error) return res.status(400).json({ error: v.error });
  try {
    const id = submit(v);
    return res.status(202).json({ id, status: 'queued' });
  } catch (err) {
    if (err instanceof queue.QueueFullError) {
      res.set('Retry-After', '5');
      return res.status(429).json({ error: 'Server busy: translation queue is full' });
    }
    return res.status(500).json({ error: 'Failed to enqueue translation' });
  }
});

// --- Poll job status --------------------------------------------------------
app.get('/api/translate/:id', (req, res) => {
  const job = db.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  return res.json({
    id: job.id,
    status: job.status,
    sourceLang: job.source_lang,
    targetLang: job.target_lang,
    translatedText: job.result || undefined,
    error: job.error || undefined,
    attempts: job.attempts,
    chunks: job.chunks,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  });
});

// --- Health + observability -------------------------------------------------
app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', queue: queue.status(), db: db.stats() });
});

app.get('/api/stats', (req, res) => {
  res.json({
    config: config.safeSummary(),
    queue: queue.status(),
    db: db.stats(),
    recent: db.recent(20),
  });
});

app.get('/api/languages', (req, res) => {
  res.json(
    [...SUPPORTED_LANGS].map((code) => ({ code, name: languageName(code) }))
  );
});

// --- Static frontend (Next.js export) + SPA fallback ------------------------
app.use(express.static(STATIC_DIR, { extensions: ['html'] }));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(STATIC_DIR, 'index.html'), (err) => {
    if (err) next();
  });
});

// --- Boot -------------------------------------------------------------------
queue.recover();
const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(
    `[server] ollama-translate listening on :${config.port}`,
    JSON.stringify(config.safeSummary())
  );
});

function shutdown(sig) {
  console.log(`[server] ${sig} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
