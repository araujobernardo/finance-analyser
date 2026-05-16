# Finance Analyser

A personal finance analysis tool for a single user. Upload monthly bank statement CSVs, get AI-powered transaction categorisation, explore spending through an interactive dashboard, set budgets, and chat with an AI about your finances.

Live at **[https://finance-analyser-dmff.onrender.com](https://finance-analyser-dmff.onrender.com)**

---

## Features

| Feature               | Description                                                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **CSV Upload**        | Import monthly bank statement exports (NZ bank format). Duplicate month detection included.                                            |
| **AI Categorisation** | Transactions are automatically categorised (Groceries, Dining, Transport, etc.) using the Claude API. Manual overrides are remembered. |
| **Dashboard**         | Income vs spend summary, category breakdown with percentages, largest transactions, interactive charts. Filterable by month.           |
| **Trends**            | Month-over-month spending trends per category once multiple months are loaded.                                                         |
| **Budget vs Actual**  | Set monthly budgets per category. Visual comparison against actual spend with over/under highlighting.                                 |
| **AI Chat**           | Natural language chat interface with full context of your transaction history, powered by Claude.                                      |
| **Authentication**    | Email/password login with email verification, JWT access tokens, and password reset via email.                                         |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Render (free tier)                  │
│  ┌──────────────────────┐  ┌──────────────────────────┐ │
│  │   Static Site        │  │   Web Service (Node.js)  │ │
│  │   React SPA (Vite)   │◄─┤   Express REST API       │ │
│  │   finance-analyser   │  │   finance-analyser-web-  │ │
│  │   -dmff.onrender.com │  │   service.onrender.com   │ │
│  └──────────────────────┘  └────────────┬─────────────┘ │
└───────────────────────────────────────── │ ─────────────┘
                                           │
                              ┌────────────▼─────────────┐
                              │   Neon PostgreSQL         │
                              │   (free tier)             │
                              └──────────────────────────┘
```

### Tech Stack

| Layer    | Technology                             |
| -------- | -------------------------------------- |
| Language | TypeScript (strict mode)               |
| Frontend | React 19 + Vite                        |
| Backend  | Express 5 + Node.js                    |
| Database | Neon PostgreSQL + Drizzle ORM          |
| Auth     | bcrypt (cost 12) + JWT (15 min tokens) |
| Email    | Resend                                 |
| AI       | Anthropic Claude API                   |
| Testing  | Vitest (unit) + Playwright (E2E)       |
| Linting  | ESLint + Prettier                      |
| Hosting  | Render (static site + web service)     |

---

## Services

| Service                            | Purpose                                                         | Free tier            |
| ---------------------------------- | --------------------------------------------------------------- | -------------------- |
| [Render](https://render.com)       | Hosts the React frontend (static) and Express API (web service) | Yes                  |
| [Neon](https://neon.tech)          | PostgreSQL database                                             | Yes, no expiry       |
| [Resend](https://resend.com)       | Transactional email (verification, password reset)              | Yes (100 emails/day) |
| [Anthropic](https://anthropic.com) | Claude API for transaction categorisation and AI chat           | Pay per use          |

---

## Local Development

### Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) database (or any PostgreSQL instance)
- A [Resend](https://resend.com) API key
- An [Anthropic](https://anthropic.com) API key

### Setup

```bash
# 1. Clone and install
git clone https://github.com/araujobernardo/finance-analyser.git
cd finance-analyser
npm install

# 2. Copy the env template and fill in your values
cp .env.example .env

# 3. Run database migrations
npm run db:migrate

# 4. Start both servers
npm run dev          # Vite dev server on http://localhost:5173
npm run server:dev   # Express API on http://localhost:3001
```

### Environment Variables

| Variable                 | Used by        | Purpose                                    |
| ------------------------ | -------------- | ------------------------------------------ |
| `DATABASE_URL`           | Server         | PostgreSQL connection string               |
| `PORT`                   | Server         | HTTP listen port (default 3001)            |
| `CORS_ORIGIN`            | Server         | Allowed CORS origin                        |
| `JWT_SECRET`             | Server         | HS256 signing key (min 32 chars)           |
| `RESEND_API_KEY`         | Server         | Resend API key for email                   |
| `RESEND_FROM_EMAIL`      | Server         | Sender address for auth emails             |
| `APP_URL`                | Server         | Base URL used in email links               |
| `VITE_API_URL`           | Browser bundle | API base URL (empty = same origin)         |
| `VITE_ANTHROPIC_API_KEY` | Browser bundle | Claude API key for categorisation and chat |

### Available Commands

| Command                | Description                     |
| ---------------------- | ------------------------------- |
| `npm run dev`          | Vite dev server (frontend)      |
| `npm run server:dev`   | Express API with hot-reload     |
| `npm run server:start` | Express API (production)        |
| `npm run build`        | Build frontend bundle           |
| `npm run test`         | Run Vitest unit tests           |
| `npm run e2e`          | Run Playwright E2E tests        |
| `npm run lint`         | Run ESLint                      |
| `npm run typecheck`    | TypeScript type check           |
| `npm run db:migrate`   | Apply database migrations       |
| `npm run db:generate`  | Generate migrations from schema |
| `npm run db:studio`    | Open Drizzle Studio             |

---

## Source Layout

```
src/
├── components/       # Reusable UI components
├── pages/            # Route-level pages (Dashboard, Budget, Chat, Auth)
├── hooks/            # Custom React hooks
├── services/         # External integrations (Claude API, storage)
├── utils/            # Pure utility functions (CSV parser, formatters)
├── types/            # Shared TypeScript types
├── context/          # React context (Auth, Account)
├── lib/              # Shared client utilities (API fetch wrapper)
├── db/               # Drizzle schema + migrations
├── server/           # Express server, routes, middleware
└── App.tsx           # Root component + routing
e2e/                  # Playwright E2E tests
```

---

## AI Agent Workflow

This project is developed using a squad of Claude Code agents coordinated by a `constitution.md` governance document. Work is tracked as GitHub Issues.

### Agents

| Agent             | Role                                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Delivery Lead** | Coordinates the squad. Picks up the next unblocked story from the backlog, spawns Designer/Developer/QA, updates the changelog, and loops to the next story. |
| **Designer**      | UI stories only. Presents 3 UX options to the user, waits for a choice, writes `specs/[dir]/ux-brief.md`, then hands off to Developer.                       |
| **Developer**     | Implements one story at a time on a feature branch. Opens a PR and transitions the issue to `status:in-review`. Never merges.                                |
| **QA**            | Reviews the PR against the Definition of Done, writes automated tests, runs CI checks, and squash-merges when all checks pass.                               |

> Speckit (`/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-taskstoissues`) is run by the **user** to define and populate the backlog before the Delivery Lead picks up stories.

### Workflow per Story

```
User → /speckit-specify → /speckit-plan → /speckit-tasks → /speckit-taskstoissues
                                                                    │
                                                                    ▼
                                                            GitHub Issues (backlog)
                                                                    │
Delivery Lead ──────────────────────────────────────────────────────┘
    │  picks next unblocked story
    │
    ├─► Designer agent (UI stories only)
    │       presents 3 UX options → user chooses → writes ux-brief.md
    │
    ├─► Developer agent
    │       creates branch → implements → opens PR → labels status:in-review
    │
    └─► QA agent
            reviews PR → writes tests → waits for CI → squash merges
            │
            └─► Delivery Lead updates CHANGELOG + dev-mentor log → next story
```

### Issue Labels

| Label                | Meaning                      |
| -------------------- | ---------------------------- |
| `type:story`         | A deliverable unit of work   |
| `type:bug`           | A bug found during QA        |
| `status:backlog`     | Available to pick up         |
| `status:in-progress` | A developer is working on it |
| `status:in-review`   | PR open, awaiting QA         |

---

## Deployment

The app is deployed on Render. Both services are connected to the `main` branch and auto-deploy on every push.

| Service                        | Type               | URL                                               |
| ------------------------------ | ------------------ | ------------------------------------------------- |
| `finance-analyser`             | Static Site        | https://finance-analyser-dmff.onrender.com        |
| `finance-analyser-web-service` | Web Service (Node) | https://finance-analyser-web-service.onrender.com |

**Static site settings:**

- Build command: `npm run build`
- Publish directory: `dist`
- Redirect/Rewrite: `/*` → `/index.html` (rewrite, for SPA routing)

**Web service settings:**

- Build command: `npm install`
- Start command: `npm run server:start`
- Environment: all server-side env vars above

After deploying a schema change, run migrations via the Render shell or locally with the production `DATABASE_URL`:

```bash
npm run db:migrate
```
