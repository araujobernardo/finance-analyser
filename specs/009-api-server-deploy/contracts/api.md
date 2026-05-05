# API Contract: Backend Server

**Branch**: `009-api-server-deploy` | **Date**: 2026-05-06

This contract defines the HTTP interface exposed by the server in this feature. All future route modules must follow the error response contract defined here.

---

## Base URL

| Environment | Base URL                                |
| ----------- | --------------------------------------- |
| Local dev   | `http://localhost:3001`                 |
| Railway     | `https://<railway-service>.railway.app` |

---

## Endpoints

### `GET /health`

Returns the server's operational status. Used by Railway as the liveness probe.

**Request**: No body, no parameters, no authentication required.

**Response — 200 OK**:

```json
{
  "status": "ok",
  "timestamp": "2026-05-06T07:59:00.000Z"
}
```

| Field       | Type   | Description                                    |
| ----------- | ------ | ---------------------------------------------- |
| `status`    | string | Always `"ok"` when the server is healthy       |
| `timestamp` | string | ISO 8601 UTC timestamp of the response instant |

**Example**:

```bash
curl http://localhost:3001/health
# → 200 OK
# → { "status": "ok", "timestamp": "2026-05-06T07:59:12.345Z" }
```

---

## Error Response Contract

All error responses — regardless of route or error type — return JSON. HTML error pages are never returned.

**Shape**:

```json
{
  "error": "Human-readable error message",
  "status": 404
}
```

| Field    | Type   | Description                              |
| -------- | ------ | ---------------------------------------- |
| `error`  | string | Human-readable description of the error  |
| `status` | number | HTTP status code (mirrors response code) |

**Common error scenarios**:

| Scenario                        | HTTP Status | `error` value example     |
| ------------------------------- | ----------- | ------------------------- |
| Route not found                 | 404         | `"Not Found"`             |
| Malformed JSON request body     | 400         | `"Bad Request"`           |
| Internal / unhandled exception  | 500         | `"Internal Server Error"` |
| CORS rejection (browser client) | 403 / 4xx   | CORS headers absent       |

> **CORS rejections**: The browser handles CORS errors before seeing the response body. The server does not return a custom JSON body for CORS rejections — the `cors` middleware handles the response by omitting the `Access-Control-Allow-Origin` header, which the browser interprets as a rejection.

---

## CORS Policy

| Rule                        | Value                                              |
| --------------------------- | -------------------------------------------------- |
| Allowed origins             | Value of `CORS_ORIGIN` environment variable        |
| Allowed methods             | `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS` |
| Allowed headers             | `Content-Type`, `Authorization`                    |
| Credentials                 | `true` (required for cookie-based auth in future)  |
| Unset `CORS_ORIGIN` default | Deny all cross-origin requests                     |

---

## Environment Variables

| Variable       | Required | Default | Description                                              |
| -------------- | -------- | ------- | -------------------------------------------------------- |
| `PORT`         | No       | `3001`  | Port the server listens on                               |
| `CORS_ORIGIN`  | Yes      | —       | Allowed browser origin (e.g., `https://app.example.com`) |
| `DATABASE_URL` | No       | —       | Postgres connection string (unused in this feature)      |

> **Railway**: `PORT` is automatically injected by Railway. `CORS_ORIGIN` must be set manually in the Railway service environment variables dashboard.
