# Ollama Translate — single-container delivery.
# Builds the static frontend, compiles the Node backend deps (better-sqlite3),
# and ships a slim runtime that serves the UI + the queue/SQLite API.

# ---- Stage 1: build the static frontend (Next.js export -> out/) ------------
FROM node:20-alpine AS frontend
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build:static

# ---- Stage 2: install/compile production server dependencies ----------------
FROM node:20-alpine AS deps
WORKDIR /app
# Toolchain needed to compile better-sqlite3 native addon on alpine (musl).
RUN apk add --no-cache python3 make g++ libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# ---- Stage 3: runtime -------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/data/translations.db

# Production node_modules (with the compiled better-sqlite3 binary)
COPY --from=deps /app/node_modules ./node_modules
# Backend source + built static frontend
COPY server ./server
COPY --from=frontend /app/out ./out
COPY package.json healthcheck.js ./

# Data volume for the SQLite database (persist across restarts)
RUN mkdir -p /data && chown -R node:node /data /app
VOLUME ["/data"]

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node healthcheck.js || exit 1

CMD ["node", "server/index.js"]
