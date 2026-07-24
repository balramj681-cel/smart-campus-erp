# Contributing to Smart Campus ERP

Thanks for your interest in contributing! 🎉

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/<your-username>/smart-campus-erp.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Set up the project — see [Getting Started](README.md#-getting-started) in the README

## Development Guidelines

- **Backend**: Follow the existing package-by-feature structure (`domain` / `application` / `infrastructure` / `presentation` per module). Keep controllers thin — business logic belongs in services.
- **Frontend**: Match the existing component/page structure. Use Tailwind utility classes consistently with the rest of the app.
- **Commits**: Write clear, descriptive commit messages (e.g. `fix: correct CORS origin parsing`, `feat: add QR attendance export`).
- **No secrets in code**: Never commit real credentials, API keys, or `.env` files — use `.env.example` as a template.

## Submitting a Pull Request

1. Make sure your branch is up to date with `main`
2. Test your changes locally (backend build + frontend build)
3. Open a PR using the [PR template](.github/PULL_REQUEST_TEMPLATE.md)
4. Describe **what** changed and **why**
5. Link any related issues

## Reporting Bugs / Requesting Features

Please use the issue templates:
- [🐛 Bug Report](.github/ISSUE_TEMPLATE/bug_report.md)
- [✨ Feature Request](.github/ISSUE_TEMPLATE/feature_request.md)

## Code of Conduct

This project follows a [Code of Conduct](CODE_OF_CONDUCT.md). Please be respectful and constructive in all interactions.

---

Questions? Open a [Discussion](../../discussions) or reach out via the contact info in the README.