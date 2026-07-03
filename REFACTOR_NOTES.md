# REFACTOR_NOTES

## 1. Current state (before refactor)

- **Stack:** Next.js 14 (App Router) + TypeScript + Tailwind. A single-page translator UI (`src/components/TranslatorInterface.tsx`) plus one server route `src/app/api/translate/route.ts` that dispatched to Ollama / OpenAI / generic OpenAI-compatible backends based on URL sniffing.
- **Config model (removed):** the browser held LLM configs in `localStorage` and the user typed API URL / model / key in a modal (`ConfigPanel.tsx`); the selected config was POSTed to the server on every request.
- **Deployment (removed):** multi-service `docker-compose.yml` (app + optional `ollama` + optional `nginx`), plus `Dockerfile.dev`, `nginx.conf`, and per-provider `.env.*` presets. Standalone Next server or static export to GitHub Pages.
- **No persistence, no queue, no rate limiting** — each browser request became one direct upstream call.

## 2. Upstream probe results (measured, not assumed)

- `GET https://gemma.aaaab3n.moe/v1/models` → OpenAI-compatible, `owned_by: "llamacpp"` (llama.cpp server, build `b9568`).
- Model id: **`gemma-4-E4B-it-qat-UD-Q4_K_XL.gguf`** (the only model; used as the default `TRANSLATE_MODEL`).
- Auth: **`Authorization: Bearer <key>`** works.
- `POST /v1/chat/completions` with `{model, messages, temperature, stream:false}` → `choices[0].message.content`. Verified `你好，世界` → `Hello, world`.
- Known upstream params (from the goal): ctx-size = 32768, **parallel = 8**.
- **Measured discrepancy (results are authoritative):** the live endpoint advertises
  `n_ctx = 4096` in `GET /v1/models`, and a chunk of ~5518 tokens was rejected with
  `HTTP 400 exceed_context_size_error … available context size (4096 tokens)`. So the
  **real usable context is 4096 tokens**, not 32768. Consequently the delivered
  **code default is `TRANSLATE_CTX_SIZE=4096`** (the real measured value); operators
  should set it to their own upstream's real available context.

## 3. New architecture

Single container. A small **Express** backend (`server/`) statically serves the Next.js **static export** (`out/`) and owns all upstream communication:

- `POST /api/translate` — validates, inserts a row into SQLite (`status=queued`), enqueues the job, and **awaits** completion, returning the translation in one response (so a single `curl` works). Also `POST /api/translate/async` (returns job id immediately) and `GET /api/translate/:id` (poll status) for the async/queue-visible flow.
- **SQLite** (`better-sqlite3`) persists every request: `id, source_text, source_lang, target_lang, status(queued|processing|done|error), result, error, attempts, chunks, created_at, updated_at`.
- **Worker pool** pulls `queued` jobs and forwards to upstream with a hard concurrency cap. Because chunk translation within a job is **sequential**, in-flight upstream calls never exceed `WORKER_CONCURRENCY`, so the upstream `parallel=8` limit is respected.
- **Chunking:** text longer than the per-chunk char budget (derived from `TRANSLATE_CTX_SIZE`) is split on paragraph/sentence/word boundaries, each chunk translated in order, then re-joined.
- **Resilience:** per-request `AbortController` timeout, exponential backoff + jitter retries on network / timeout / 5xx / 429. On HTTP 429 the pool **adaptively halves** effective concurrency (min 1) with a cooldown and recovers by +1 after sustained success.
- The upstream **key/URL come only from environment variables**; the frontend no longer has any API-config entry, and the key is never logged, stored in the DB, or returned to the client.

## 4. Chosen defaults & rationale (tie to parallel=8, measured ctx=4096)

| Variable | Default | Why |
|---|---|---|
| `WORKER_CONCURRENCY` | `8` | Exactly the upstream `parallel=8`. Sequential per-job chunking keeps total in-flight upstream calls ≤ this, so we saturate the backend without overloading it. |
| `QUEUE_MAX_SIZE` | `100` | Bounded backlog to protect memory/latency. When full, new requests are **rejected with HTTP 429** + `Retry-After` (fail fast rather than unbounded queue growth). |
| `REQUEST_TIMEOUT` | `60000` ms | A 32k-ctx chunk on a small quantized Gemma can take tens of seconds under load; 60s per upstream call avoids killing legitimately slow generations while still bounding hangs. |
| `MAX_RETRIES` | `3` | Rides out transient 5xx/429/timeout without amplifying load. Backoff `500ms · 2^n` + jitter (≈0.5s, 1s, 2s). |
| `TRANSLATE_CTX_SIZE` | `4096` | The upstream's real available context (measured). Used to derive the chunk budget. |
| chunk char budget | `⌊ctx/4⌋` chars (**1024 at ctx=4096**) | Reserves the majority of the window for the prompt + generated translation (output can exceed input, e.g. zh→en token expansion). Conservative because CJK packs more tokens/char; splits on paragraph→sentence→word→hard-cut boundaries. Verified: 1024-char chunks stay well under the 4096-token limit. |
| `REQUEST_TIMEOUT` client wait | job-lifecycle bound (≈ 5 min hard cap) | The synchronous endpoint waits for the worker; capped so a wedged job still returns an error instead of hanging forever. |
| `PORT` | `3000` | — |
| `DB_PATH` | `/data/translations.db` | Lives on the mounted volume for persistence across container restarts. |

## 5. Assumptions

- **Synchronous translate endpoint by default.** The goal wants both a job/queue/DB model *and* a single `curl` that returns a translation; I reconcile them by persisting + queueing + worker-processing every request while the HTTP handler awaits the result. An async submit/poll pair is also exposed.
- **Frontend kept, config UI stripped.** Rather than rewrite the UI, the existing Next.js/Tailwind page is reused as a static export with the LLM-config modal and localStorage config removed; it now posts only `{text, sourceLang, targetLang}`.
- **`better-sqlite3`** (synchronous, embedded) chosen over async drivers for simplicity and transactional status updates; compiled in the Docker build (alpine + build deps), runtime copies the built module.
- **Reject-on-full** over block-on-full for `QUEUE_MAX_SIZE`, to give clients a fast, explicit signal.
- Default model is the single model the upstream exposes; overridable via `TRANSLATE_MODEL`.

## 6. Left out / risks

- GitHub Pages deployment has been removed (`.github/workflows/pages.yml` deleted); Docker is the sole delivery. The static export exists only to be served by the backend.
- In-memory queue: jobs `queued`/`processing` at crash are re-queued on startup, but a job mid-upstream-call is retried from scratch (translation is idempotent, so safe).
- No auth on the local API surface — intended to run behind the user's own network/proxy.
