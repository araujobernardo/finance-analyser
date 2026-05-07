# Architecture

## Tech Stack

| Layer        | Technology                       |
| ------------ | -------------------------------- |
| Language     | TypeScript (strict mode)         |
| UI framework | React 18 — functional components |
| Build tool   | Vite                             |
| Test runner  | Vitest                           |
| Linter       | ESLint                           |
| Formatter    | Prettier                         |
| Data storage | Browser `localStorage`           |
| API server   | Express + Node.js                |
| Database     | Supabase PostgreSQL              |
| ORM          | Drizzle ORM                      |
| AI/LLM       | Anthropic Claude API             |
| Auth         | bcrypt (cost 12) + JWT (15 min)  |
| Email        | Resend                           |

---

## Environment Variables

| Variable            | Used by        | Purpose                                      |
| ------------------- | -------------- | -------------------------------------------- |
| `DATABASE_URL`      | Server         | Supabase PostgreSQL connection string        |
| `PORT`              | Server         | HTTP listen port (default 3001)              |
| `CORS_ORIGIN`       | Server         | Allowed CORS origin (warns if unset)         |
| `JWT_SECRET`        | Server         | HS256 signing key for access tokens          |
| `RESEND_API_KEY`    | Server         | Resend API key for transactional email       |
| `RESEND_FROM_EMAIL` | Server         | Sender address for auth emails               |
| `APP_URL`           | Server         | Base URL for email links (default localhost) |
| `VITE_API_URL`      | Browser bundle | API base URL for fetch calls (optional)      |

---

## Key Constraints

- **Runs entirely in the browser** — no server, no backend, no deployment.
- **Authentication** — email/password via bcrypt + JWT. Tokens stored in `sessionStorage`. Auth pages (`/login`, `/signup`, etc.) are public; all other routes redirect to `/login` if unauthenticated.
- **Data input** — monthly CSV exports from a New Zealand bank account.
- **Persistence** — `localStorage` only (no external storage).
- **AI** — Claude API for transaction categorisation and the chat interface.
- **Server-side only** — and must never be imported from React components or the Vite browser bundle. , , and (postgres.js) use Node.js built-ins that Vite cannot bundle for the browser.

---

## Source File Layout

```
src/
├── components/       # Shared, reusable UI components
│   └── *.tsx
│   └── *.test.tsx    # Co-located component tests
├── pages/            # Top-level route pages (Dashboard, Budget, Chat)
│   └── *.tsx
├── hooks/            # Custom React hooks (extracted reusable logic)
│   └── use*.ts
├── services/         # External integrations (Jira API, Anthropic API)
│   └── *.ts
├── utils/            # Pure utility functions (CSV parser, formatters)
│   └── *.ts
│   └── *.test.ts     # Co-located utility tests
├── types/            # Shared TypeScript type definitions
│   └── *.ts
└── App.tsx           # Root component + routing
```

---

## Available Commands

| Command                | Description                                |
| ---------------------- | ------------------------------------------ |
| `npm run dev`          | Start Vite dev server (browser bundle)     |
| `npm run server:dev`   | Start Express API server with hot-reload   |
| `npm run server:start` | Start Express API server (production mode) |
| `npm run build`        | Build browser bundle for production        |
| `npm run lint`         | Run ESLint                                 |

---

## Architectural Decisions

- **No class components** — React functional components and hooks only.
- **No `any` types** — TypeScript strict mode enforced everywhere.
- **Component size limit** — split any component exceeding 150 lines.
- **Custom hooks** — extract reusable state/effect logic into `src/hooks/`.
- **Co-located tests** — test files live next to the source file they test.
- **Jira integration** — via Node scripts in `scripts/*.mjs`, not CLI flags.
- **gh CLI path** — always use the full path `"C:/Program Files/GitHub CLI/gh.exe"`.
