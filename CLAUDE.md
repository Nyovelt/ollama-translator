# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Next.js dev server for UI work (http://localhost:3000). Does NOT serve the translation API.
- `npm run build:static` — static export of the UI to `out/` (`NEXT_STATIC_EXPORT=true`). The container serves this.
- `npm start` / `npm run server` — run the Express backend (`server/index.js`); serves `out/` + the API.
- `npm run lint` — ESLint (`next/core-web-vitals`).

There is no automated test suite; verification is done by running the container and exercising the API (see `REFACTOR_NOTES.md`). UI type checking happens as part of `next build`.

## Architecture

Two pieces, one container:

1. **Frontend** (`src/`, Next.js 14 App Router + TypeScript + Tailwind) — a single translator page (`src/components/TranslatorInterface.tsx`) built as a **static export** (`out/`). It has no LLM-config UI; it POSTs only `{ text, sourceLang, targetLang }` to `/api/translate`. There is **no** Next.js API route anymore.
2. **Backend** (`server/`, Node + Express) — the container entrypoint. Statically serves `out/` and owns all upstream communication. The upstream URL/key/model come **only from environment variables**.
   - `server/config.js` — env-var config (+ redacted `safeSummary()` for logs; the key is never logged).
   - `server/db.js` — SQLite (`better-sqlite3`) persistence: one row per request with `status` (`queued→processing→done/error`), `result`, `error`, `attempts` (upstream tries incl. retries), `chunks`, timestamps.
   - `server/translate.js` — prompt building, `getLanguageName`, ctx-derived **chunking** of long text (sequential per job), the upstream `POST /v1/chat/completions` call, and per-request timeout + retry/backoff.
   - `server/queue.js` — in-memory FIFO + worker pool bounded by `WORKER_CONCURRENCY`, reject-on-full at `QUEUE_MAX_SIZE`, adaptive concurrency down-scaling on HTTP 429, and startup recovery of pending jobs.
   - `server/index.js` — Express routes: `POST /api/translate` (sync), `POST /api/translate/async`, `GET /api/translate/:id`, `GET /healthz`, `GET /api/stats`, `GET /api/languages` + static/SPA serving.

Because chunks within a job are translated sequentially, concurrent upstream calls never exceed `WORKER_CONCURRENCY` (kept ≤ the upstream `parallel` limit).

## Deployment

**Single Docker container** — no docker-compose, no GitHub Pages. The multi-stage `Dockerfile`: stage 1 builds the static UI, stage 2 compiles the server deps (`better-sqlite3` needs python3/make/g++ on alpine), stage 3 is a slim runtime running `node server/index.js`. SQLite lives on a `/data` volume. `healthcheck.js` hits `/healthz`. Config and the exact `docker build`/`docker run` are in `README.md`; design rationale and tuning defaults are in `REFACTOR_NOTES.md`.

> `TRANSLATE_CTX_SIZE` defaults to `4096` — the reference upstream's real available context (its `/v1/models` advertises `n_ctx=4096`, despite the goal stating 32768). Set it to your upstream's real context.

## Adding a language

Language codes are duplicated in two places that must stay in sync: `DEFAULT_LANGUAGES` in `src/types/translator.ts` (UI dropdown) and the `LANGUAGE_NAMES` map + `SUPPORTED_LANGS` set in `server/` (`translate.js` / `index.js`, used to build the prompt and validate requests).
