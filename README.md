# Ollama Translate

A Google-Translate-style web app backed by a **server-side** LLM translation API.
The backend (Node + Express) statically serves the built UI, reads the upstream
LLM configuration **only from environment variables**, persists every request in
**SQLite**, and forwards jobs to the upstream through a **rate-limited worker
queue** with configurable concurrency, retries and backoff.

Delivered as a **single Docker container** — one `docker build`, one `docker run`.

## Features

- 🌐 Clean translator UI (source/target language, `auto` detect, copy, text-to-speech)
- 🔒 Upstream API URL/key/model configured **server-side via env vars** (no secrets in the browser)
- 🗃️ Every request persisted in SQLite with full status flow (`queued → processing → done/error`)
- 🚦 Backend queue + worker pool: configurable concurrency (never exceeds the upstream `parallel` limit) and bounded backlog
- 🧩 Long text is automatically **chunked** to fit the upstream context window and re-joined
- ♻️ Timeouts, retries with exponential backoff, and adaptive concurrency down-scaling on HTTP 429

## Architecture

```
Browser ──> Express server (single container)
              ├── serves the static Next.js UI (out/)
              ├── POST /api/translate  → persist(SQLite) → enqueue → worker → upstream → result
              └── worker pool (WORKER_CONCURRENCY) ──> upstream /v1/chat/completions
```

- Chunks within one request are translated **sequentially**, so the number of
  concurrent upstream calls never exceeds `WORKER_CONCURRENCY`.
- See `REFACTOR_NOTES.md` for the design decisions and tuning rationale.

## Quick start (Docker)

**Build:**

```bash
docker build -t ollama-translate:latest .
```

**Run:**

```bash
docker run -d --name ollama-translate \
  -p 3000:3000 \
  -e TRANSLATE_API_BASE_URL="https://gemma.aaaab3n.moe" \
  -e TRANSLATE_API_KEY="sk-your-upstream-key" \
  -e TRANSLATE_MODEL="gemma-4-E4B-it-qat-UD-Q4_K_XL.gguf" \
  -e WORKER_CONCURRENCY=8 \
  -e QUEUE_MAX_SIZE=100 \
  -v ollama-translate-data:/data \
  ollama-translate:latest
```

Then open <http://localhost:3000>.

> **`TRANSLATE_CTX_SIZE` defaults to `4096`** — the reference upstream
> (`gemma.aaaab3n.moe`) reports an available context of 4096 tokens (verified via
> a live probe). If your upstream has a larger window, raise it so long text is
> chunked more efficiently. See `REFACTOR_NOTES.md` §2/§4.

Secrets are passed only through `-e` (or `--env-file .env`); the key is never
baked into the image, written to the database, or printed to logs.

## Configuration (environment variables)

| Variable | Default | Description |
|---|---|---|
| `TRANSLATE_API_BASE_URL` | `https://gemma.aaaab3n.moe` | Upstream base URL (no `/v1` suffix; the server appends `/v1/chat/completions`). |
| `TRANSLATE_API_KEY` | *(empty)* | Upstream key, sent as `Authorization: Bearer <key>`. |
| `TRANSLATE_MODEL` | `gemma-4-E4B-it-qat-UD-Q4_K_XL.gguf` | Model id (see `GET /v1/models`). |
| `TRANSLATE_CTX_SIZE` | `4096` | Upstream context window (tokens); drives chunk sizing. Set to your upstream's real available context. |
| `WORKER_CONCURRENCY` | `8` | Max concurrent upstream calls. Keep ≤ the upstream `parallel` limit. |
| `QUEUE_MAX_SIZE` | `100` | Max queued jobs; requests beyond this get **HTTP 429** (`Retry-After`). |
| `REQUEST_TIMEOUT` | `60000` | Per-upstream-request timeout (ms). |
| `MAX_RETRIES` | `3` | Retries per chunk on network/timeout/5xx/429 (exponential backoff + jitter). |
| `CHUNK_CHAR_BUDGET` | `⌊CTX/4⌋` | Optional override for chunk size in characters. |
| `PORT` | `3000` | HTTP port. |
| `DB_PATH` | `/data/translations.db` | SQLite file (put on the mounted volume). |

## API

### `POST /api/translate` — synchronous

Persists + enqueues the job and waits for the result.

```bash
curl -s http://localhost:3000/api/translate \
  -H 'Content-Type: application/json' \
  -d '{"text":"你好，世界","sourceLang":"zh","targetLang":"en"}'
# → {"id":"...","translatedText":"Hello, world"}
```

Body: `{ text, sourceLang, targetLang }` where `sourceLang` may be `auto`.
Errors: `400` invalid input, `429` queue full, `502` upstream failure, `504` timeout.

### `POST /api/translate/async` — non-blocking

Returns `202 {"id","status":"queued"}` immediately.

### `GET /api/translate/:id` — poll job status

```json
{ "id":"...","status":"done","translatedText":"...","attempts":1,"chunks":1,
  "createdAt":"...","updatedAt":"..." }
```

### `GET /healthz` — health + live queue/DB counters

### `GET /api/stats` — config summary (key redacted), queue state, recent jobs

### `GET /api/languages` — supported language codes

## Local development

```bash
npm install
npm run build:static          # builds the UI into out/
TRANSLATE_API_BASE_URL=https://gemma.aaaab3n.moe \
TRANSLATE_API_KEY=sk-... \
TRANSLATE_CTX_SIZE=4096 \
DB_PATH=./data/translations.db \
npm start                     # node server/index.js, serves UI + API on :3000
```

`npm run dev` still runs the Next.js dev server for UI work, but the translation
API is served by `server/index.js` (the container entrypoint), not by Next.

## Notes

- Docker is the only supported runtime (there is no separate static/Pages
  deployment — the static export exists solely to be served by the backend).
- Jobs left `queued`/`processing` when the container stops are re-queued on the
  next start (translation is idempotent).
- No `docker-compose` — a single container is the whole delivery.
