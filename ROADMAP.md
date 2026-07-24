# Roadmap

## Near-term
- [ ] Automated test suite (JUnit + Mockito for backend, Vitest/RTL for frontend)
- [ ] Flyway-based database migrations (replace `ddl-auto`)
- [ ] API versioning (`/api/v1/...`)
- [ ] CI pipeline running tests + build on every PR

## Mid-term
- [ ] Push notifications (web push / mobile)
- [ ] Export reports as PDF/Excel
- [ ] Bulk CSV import for student/faculty onboarding
- [ ] Audit logging for admin actions

## Long-term
- [ ] Redis-backed STOMP broker relay for multi-instance WebSocket scaling
- [ ] Mobile app (React Native) reusing existing API
- [ ] Multi-tenancy (support multiple institutions from one deployment)

---

Have an idea? Open a [feature request](.github/ISSUE_TEMPLATE/feature_request.md) — contributions and suggestions welcome.