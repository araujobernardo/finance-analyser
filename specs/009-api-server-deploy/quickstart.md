# Quickstart: Backend API Server

## Prerequisites

- Node.js 18+
- npm (comes with Node.js)
- The repo cloned and `npm install` run

---

## Local Development

### Step 1 — Create your `.env` file

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

```
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

> `CORS_ORIGIN=http://localhost:5173` allows the Vite dev server to call the API during local development.

### Step 2 — Start the server

```bash
npm run server:dev
```

Expected output:

```
Server running on port 3001
```

The server auto-reloads when you change any file inside `src/server/`.

### Step 3 — Verify the health endpoint

```bash
curl http://localhost:3001/health
```

Expected response:

```json
{ "status": "ok", "timestamp": "2026-05-06T07:59:12.345Z" }
```

---

## Railway Deployment

### Step 1 — Push the branch to GitHub

The `railway.toml` file at the project root tells Railway:

- Start command: `npm run server:start`
- Health check path: `/GET /health`
- Health check timeout: 300 seconds

### Step 2 — Create a Railway service

1. Open [Railway](https://railway.app) → New Project → Deploy from GitHub repo
2. Select the `finance-analyser` repository
3. Railway detects `railway.toml` automatically

### Step 3 — Set environment variables in Railway

In the Railway service dashboard → **Variables**, add:

| Variable      | Value                                                |
| ------------- | ---------------------------------------------------- |
| `CORS_ORIGIN` | Your frontend domain, e.g. `https://app.example.com` |

> **Do not set `PORT`** — Railway injects it automatically.  
> **Do not set `DATABASE_URL`** — not required until the API layer is added.

### Step 4 — Deploy and verify

1. Railway builds and deploys automatically on push.
2. Watch the deployment log — expect to see `Server running on port <PORT>`.
3. Railway marks the service **Active** once `/health` returns 200.
4. Verify manually: `curl https://<railway-service>.railway.app/health`

---

## Useful Commands

| Command                                | What it does                                  |
| -------------------------------------- | --------------------------------------------- |
| `npm run server:dev`                   | Start server locally with hot-reload          |
| `npm run server:start`                 | Start server for production (used by Railway) |
| `tsc -p tsconfig.server.json --noEmit` | Type-check server code without building       |

---

## Adding a New Route

1. Create `src/server/routes/<name>.ts` — export a `Router` instance with your route handlers
2. In `src/server/index.ts`, import and mount the router: `app.use('/api/<path>', <name>Router)`
3. The new route automatically inherits CORS enforcement and JSON error handling

No changes to middleware, CORS config, or the error handler are required.

---

## Important: Server-Side Only

`src/server/` uses the `express` and `cors` packages which require Node.js built-ins. It **cannot** be imported from React components or any file in `src/` that ends up in the Vite browser bundle. The `tsconfig.app.json` excludes `src/server/` to enforce this at the TypeScript level.
