# Security Policy

## Supported Versions

This project is under active development. Security fixes are applied to the `main` branch only.

| Version | Supported |
|---|---|
| main    | ✅ |

## Reporting a Vulnerability

If you discover a security vulnerability, **please do not open a public issue.**

Instead, report it privately via one of:
- GitHub's [private vulnerability reporting](../../security/advisories/new) (preferred)
- Direct contact with the maintainer (see README for contact info)

Please include:
- A description of the vulnerability and its potential impact
- Steps to reproduce
- Any relevant logs or screenshots (with secrets redacted)

We aim to acknowledge reports within a few days and will keep you updated as the issue is investigated and resolved.

## Scope

This includes the backend API, authentication/authorization logic, and the frontend application in this repository. It does **not** include third-party services this project depends on (Neon, Render, Vercel, ImageKit, Brevo) — please report issues with those directly to their respective providers.

## Security Practices in This Project

- JWT-based stateless authentication with short-lived access tokens
- Passwords hashed (never stored in plaintext)
- Secrets are managed via environment variables — never committed to source control
- CORS origins are explicitly allow-listed per environment
- File uploads are validated (extension allow-list, size limits) before storage

If you're setting up your own deployment of this project, make sure to generate your own JWT secret and database credentials — never reuse example/sample values.