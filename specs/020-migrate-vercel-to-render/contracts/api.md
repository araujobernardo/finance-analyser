# API Contracts: Migrate Deployment from Vercel to Render

No API endpoints change as part of this migration. The existing REST API contracts remain identical.

## Deployment Change

|              | Before (Vercel)                 | After (Render)                               |
| ------------ | ------------------------------- | -------------------------------------------- |
| Frontend URL | Vercel Static                   | `https://finance-analyser-dmff.onrender.com` |
| API base URL | `<vercel-url>/api` (serverless) | Render Web Service subdomain                 |
| CORS         | Not required (same origin)      | Required (`CORS_ORIGIN` env var)             |

## Existing Endpoints (unchanged)

- `GET /health` — returns `{"status":"ok", ...}`
- `POST /api/auth/login` — authenticates user, returns JWT
- `POST /api/auth/signup` — creates account
- `POST /api/auth/logout`
- `GET /api/accounts` — list accounts
- `GET /api/accounts/:accountId/transactions` — list transactions
- `POST /api/accounts/:accountId/transactions` — import CSV
- `GET /api/transactions` — list all transactions
- `GET /api/assets` — list assets
- `POST /api/assets` — create asset
- `PUT /api/assets/:id` — update asset
- `DELETE /api/assets/:id` — delete asset
- `GET /api/liabilities` — list liabilities
- `POST /api/liabilities` — create liability
- `PUT /api/liabilities/:id` — update liability
- `DELETE /api/liabilities/:id` — delete liability
