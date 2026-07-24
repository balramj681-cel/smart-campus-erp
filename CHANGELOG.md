# Changelog

All notable changes to this project are documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] — 2026-07-23

### Added
- Initial public release of Smart Campus ERP
- JWT authentication with email OTP verification
- Role-based dashboards for Admin, Faculty, and Student
- Attendance (including QR-based) and Timetable modules
- Examinations, Marks, and Coursework/Assignments
- Fee management, Library, Notice Board, and Document Center
- Real-time chat and notifications via WebSocket (STOMP/SockJS)
- Leave management and Grievance portal
- Academic Calendar and Reports

### Infrastructure
- Deployed: Vercel (frontend), Render (backend, Docker), Neon (PostgreSQL)
- File storage migrated to ImageKit
- Transactional email migrated from SMTP to Brevo HTTP API
- Dark mode and mobile-responsive layout across the app

---

_Earlier development history predates this changelog._