'use strict';

const config = require('./config');
const db = require('./db');
const { translateText } = require('./translate');

// In-memory FIFO of job ids waiting to be processed. The authoritative record
// of every job lives in SQLite; this queue only drives scheduling.
const waiting = [];
const inFlight = new Set();

// Resolvers for the synchronous endpoint: id -> [{resolve}] waiting for done/error.
const waiters = new Map();

// ---- Adaptive concurrency (reacts to upstream 429) --------------------------
let effectiveConcurrency = config.workerConcurrency;
let cooldownUntil = 0;
let successStreak = 0;

function now() {
  return Date.now();
}

function onRateLimit() {
  // Halve effective concurrency (min 1) and start a cooldown before recovery.
  const next = Math.max(1, Math.floor(effectiveConcurrency / 2));
  if (next < effectiveConcurrency) {
    console.warn(
      `[queue] upstream 429 — reducing concurrency ${effectiveConcurrency} -> ${next}`
    );
  }
  effectiveConcurrency = next;
  cooldownUntil = now() + 5000;
  successStreak = 0;
}

function onSuccess() {
  if (effectiveConcurrency >= config.workerConcurrency) return;
  if (now() < cooldownUntil) return;
  successStreak += 1;
  // Recover one slot after a short streak of clean successes.
  if (successStreak >= 3) {
    effectiveConcurrency = Math.min(config.workerConcurrency, effectiveConcurrency + 1);
    successStreak = 0;
    console.warn(`[queue] recovering concurrency -> ${effectiveConcurrency}`);
  }
}

// ---- Scheduling -------------------------------------------------------------
function pump() {
  while (inFlight.size < effectiveConcurrency && waiting.length > 0) {
    const id = waiting.shift();
    inFlight.add(id);
    process(id).finally(() => {
      inFlight.delete(id);
      // Re-pump on next tick so concurrency changes take effect.
      setImmediate(pump);
    });
  }
}

async function process(id) {
  const job = db.getJob(id);
  if (!job) return;
  db.markProcessing(id);
  try {
    const result = await translateText(
      job.source_text,
      job.source_lang,
      job.target_lang,
      { onRateLimit, onAttempt: () => db.bumpAttempts(id) }
    );
    db.markDone(id, result);
    onSuccess();
    resolveWaiters(id, { status: 'done', result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    db.markError(id, message);
    resolveWaiters(id, { status: 'error', error: message });
  }
}

function resolveWaiters(id, payload) {
  const list = waiters.get(id);
  if (!list) return;
  waiters.delete(id);
  for (const resolve of list) resolve(payload);
}

// ---- Public API -------------------------------------------------------------

class QueueFullError extends Error {
  constructor() {
    super('Queue is full');
    this.name = 'QueueFullError';
  }
}

// Enqueue an already-persisted job id. Throws QueueFullError if the backlog cap
// is exceeded (reject-on-full policy).
function enqueue(id) {
  if (waiting.length >= config.queueMaxSize) {
    throw new QueueFullError();
  }
  waiting.push(id);
  setImmediate(pump);
}

// Wait for a job to reach a terminal state (for the synchronous endpoint).
function waitFor(id, timeoutMs = config.clientWaitTimeout) {
  // Already terminal in the DB?
  const job = db.getJob(id);
  if (job && (job.status === 'done' || job.status === 'error')) {
    return Promise.resolve(
      job.status === 'done'
        ? { status: 'done', result: job.result }
        : { status: 'error', error: job.error }
    );
  }
  return new Promise((resolve) => {
    let settled = false;
    const done = (payload) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(payload);
    };
    const timer = setTimeout(() => {
      done({ status: 'timeout', error: 'Timed out waiting for translation' });
    }, timeoutMs);

    const list = waiters.get(id) || [];
    list.push(done);
    waiters.set(id, list);
  });
}

// On startup, recover any jobs left queued/processing (e.g. after a crash).
function recover() {
  const pending = db.getPending();
  for (const job of pending) {
    db.requeue(job.id);
    waiting.push(job.id);
  }
  if (pending.length) {
    console.log(`[queue] recovered ${pending.length} pending job(s) from DB`);
    setImmediate(pump);
  }
}

function status() {
  return {
    waiting: waiting.length,
    inFlight: inFlight.size,
    effectiveConcurrency,
    maxConcurrency: config.workerConcurrency,
    queueMaxSize: config.queueMaxSize,
  };
}

module.exports = {
  enqueue,
  waitFor,
  recover,
  status,
  QueueFullError,
};
