# API Contracts: Email and Password Authentication

**Branch**: `010-email-password-auth` | **Date**: 2026-05-06  
**Base path**: `/api/auth`  
**Content-Type**: `application/json` (all requests and responses)

---

## Common Error Shape

All error responses use this envelope, consistent with the existing server error handler from feature 009:

```json
{
  "error": "<human-readable message>",
  "status": <HTTP status code>
}
```

---

## POST /api/auth/register

**Purpose**: Create a new user account and send a verification email.

### Request

```json
{
  "email": "user@example.com",
  "displayName": "Jane Smith",
  "password": "mypassword123"
}
```

| Field       | Type   | Required | Constraints                       |
| ----------- | ------ | -------- | --------------------------------- |
| email       | string | YES      | Valid email format; max 255 chars |
| displayName | string | YES      | Non-empty; max 100 chars          |
| password    | string | YES      | Minimum 8 characters              |

### Responses

**201 Created** — Account created, verification email sent.

```json
{
  "message": "Registration successful. Please check your email to verify your account."
}
```

**409 Conflict** — Email already registered (case-insensitive match).

```json
{
  "error": "An account with this email address already exists.",
  "status": 409
}
```

**400 Bad Request** — Validation failure.

```json
{
  "error": "Password must be at least 8 characters.",
  "status": 400
}
```

---

## POST /api/auth/verify-email

**Purpose**: Confirm a user's email address using the token from the verification email.

### Request

```json
{
  "token": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Field | Type   | Required | Constraints          |
| ----- | ------ | -------- | -------------------- |
| token | string | YES      | Raw UUID token value |

### Responses

**200 OK** — Email verified successfully.

```json
{
  "message": "Email verified successfully. You can now sign in."
}
```

**400 Bad Request** — Token expired.

```json
{
  "error": "This verification link has expired. Please request a new one.",
  "status": 400,
  "code": "TOKEN_EXPIRED"
}
```

**400 Bad Request** — Token already used or invalid.

```json
{
  "error": "This verification link is invalid or has already been used.",
  "status": 400,
  "code": "TOKEN_INVALID"
}
```

---

## POST /api/auth/resend-verification

**Purpose**: Issue a new verification email, invalidating the previous token. Always returns the same response regardless of whether the email is registered or already verified (privacy).

### Request

```json
{
  "email": "user@example.com"
}
```

| Field | Type   | Required | Constraints        |
| ----- | ------ | -------- | ------------------ |
| email | string | YES      | Valid email format |

### Responses

**200 OK** — Always returned (identical for registered, unregistered, and already-verified addresses).

```json
{
  "message": "If your account exists and is not yet verified, a new verification email has been sent."
}
```

---

## POST /api/auth/login

**Purpose**: Authenticate a verified user and return a short-lived access token.

### Request

```json
{
  "email": "user@example.com",
  "password": "mypassword123"
}
```

| Field    | Type   | Required |
| -------- | ------ | -------- |
| email    | string | YES      |
| password | string | YES      |

### Responses

**200 OK** — Authentication successful.

```json
{
  "accessToken": "<JWT string>",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "displayName": "Jane Smith"
  }
}
```

JWT claims:

- `sub`: user UUID
- `iat`: issued-at timestamp
- `exp`: issued-at + 15 minutes

**401 Unauthorized** — Wrong email, wrong password, or unregistered email (generic — does not reveal which field was wrong).

```json
{
  "error": "Invalid email or password.",
  "status": 401
}
```

**403 Forbidden** — Correct credentials but email not verified.

```json
{
  "error": "Please verify your email address before signing in.",
  "status": 403,
  "code": "EMAIL_NOT_VERIFIED"
}
```

The `code: "EMAIL_NOT_VERIFIED"` field allows the frontend to surface a "resend verification email" prompt specifically for this case.

---

## POST /api/auth/forgot-password

**Purpose**: Request a password reset email. Always returns an identical response regardless of whether the email is registered (privacy — FR-018).

### Request

```json
{
  "email": "user@example.com"
}
```

| Field | Type   | Required |
| ----- | ------ | -------- |
| email | string | YES      |

### Responses

**200 OK** — Always returned, regardless of registration status.

```json
{
  "message": "If this email is registered, you will receive a password reset link shortly."
}
```

---

## POST /api/auth/reset-password

**Purpose**: Set a new password using the token from the reset email.

### Request

```json
{
  "token": "550e8400-e29b-41d4-a716-446655440000",
  "password": "newpassword456"
}
```

| Field    | Type   | Required | Constraints          |
| -------- | ------ | -------- | -------------------- |
| token    | string | YES      | Raw UUID token value |
| password | string | YES      | Minimum 8 characters |

### Responses

**200 OK** — Password updated successfully.

```json
{
  "message": "Password reset successfully. You can now sign in with your new password."
}
```

**400 Bad Request** — Token expired or already used.

```json
{
  "error": "This reset link is invalid or has expired. Please request a new one.",
  "status": 400
}
```

**400 Bad Request** — Password too short.

```json
{
  "error": "Password must be at least 8 characters.",
  "status": 400
}
```

---

## Environment Variables

| Variable          | Required | Description                                               |
| ----------------- | -------- | --------------------------------------------------------- |
| JWT_SECRET        | YES      | Secret key for HS256 JWT signing; minimum 32 characters   |
| RESEND_API_KEY    | YES      | API key from resend.com dashboard                         |
| RESEND_FROM_EMAIL | YES      | Verified sender address in Resend (e.g. auth@example.com) |
| APP_URL           | YES      | Base URL of the frontend (used to build email links)      |

`APP_URL` examples:

- Local dev: `http://localhost:5173`
- Production: `https://finance-analyser.example.com`
