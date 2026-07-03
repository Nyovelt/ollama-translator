'use strict';

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const config = require('./config');

// Ensure the directory for the SQLite file exists (e.g. the mounted volume).
const dir = path.dirname(config.dbPath);
try {
  fs.mkdirSync(dir, { recursive: true });
} catch (e) {
  // best effort; open() below will surface a real error if the path is bad
}

const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

db.exec(`
  CREATE TABLE IF NOT EXISTS translations (
    id           TEXT PRIMARY KEY,
    source_text  TEXT NOT NULL,
    source_lang  TEXT NOT NULL,
    target_lang  TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'queued',
    result       TEXT,
    error        TEXT,
    attempts     INTEGER NOT NULL DEFAULT 0,
    chunks       INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_translations_status ON translations(status);
`);

const stmts = {
  insert: db.prepare(`
    INSERT INTO translations
      (id, source_text, source_lang, target_lang, status, chunks, created_at, updated_at)
    VALUES
      (@id, @source_text, @source_lang, @target_lang, 'queued', @chunks, @now, @now)
  `),
  setProcessing: db.prepare(`
    UPDATE translations
    SET status = 'processing', updated_at = @now
    WHERE id = @id
  `),
  bumpAttempts: db.prepare(`
    UPDATE translations SET attempts = attempts + 1 WHERE id = @id
  `),
  setDone: db.prepare(`
    UPDATE translations
    SET status = 'done', result = @result, error = NULL, updated_at = @now
    WHERE id = @id
  `),
  setError: db.prepare(`
    UPDATE translations
    SET status = 'error', error = @error, updated_at = @now
    WHERE id = @id
  `),
  requeue: db.prepare(`
    UPDATE translations
    SET status = 'queued', updated_at = @now
    WHERE id = @id
  `),
  get: db.prepare(`SELECT * FROM translations WHERE id = @id`),
  pending: db.prepare(`
    SELECT * FROM translations
    WHERE status IN ('queued', 'processing')
    ORDER BY created_at ASC
  `),
  countByStatus: db.prepare(`
    SELECT status, COUNT(*) AS n FROM translations GROUP BY status
  `),
  recent: db.prepare(`
    SELECT id, source_lang, target_lang, status, attempts, chunks, created_at, updated_at
    FROM translations ORDER BY created_at DESC LIMIT @limit
  `),
};

function nowIso() {
  return new Date().toISOString();
}

module.exports = {
  db,
  nowIso,

  insertJob({ id, sourceText, sourceLang, targetLang, chunks }) {
    stmts.insert.run({
      id,
      source_text: sourceText,
      source_lang: sourceLang,
      target_lang: targetLang,
      chunks,
      now: nowIso(),
    });
  },

  markProcessing(id) {
    stmts.setProcessing.run({ id, now: nowIso() });
  },

  // Count one upstream request attempt (incremented per try, including retries).
  bumpAttempts(id) {
    stmts.bumpAttempts.run({ id });
  },

  markDone(id, result) {
    stmts.setDone.run({ id, result, now: nowIso() });
  },

  markError(id, error) {
    stmts.setError.run({ id, error: String(error).slice(0, 2000), now: nowIso() });
  },

  requeue(id) {
    stmts.requeue.run({ id, now: nowIso() });
  },

  getJob(id) {
    return stmts.get.get({ id });
  },

  getPending() {
    return stmts.pending.all();
  },

  stats() {
    const rows = stmts.countByStatus.all();
    const out = { queued: 0, processing: 0, done: 0, error: 0 };
    for (const r of rows) out[r.status] = r.n;
    return out;
  },

  recent(limit = 20) {
    return stmts.recent.all({ limit });
  },
};
