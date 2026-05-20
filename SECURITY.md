# Security Policy

## Reporting a Vulnerability

This is a personal finance tool. If you discover a security vulnerability,
please report it by opening a GitHub Issue labelled `type:bug`.

Do not include sensitive data (credentials, personal financial data) in any
issue or pull request.

## Secrets Management

All credentials are stored in `.env` (never committed). The `.env.example`
file documents the required variables with placeholder values only.
