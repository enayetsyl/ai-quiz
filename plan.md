# NCTB Quiz Generator – Delivery Plan

This plan translates `nctb_quiz_generator_mvp_requirements_updated.md` into actionable implementation steps. We will build feature-by-feature, delivering backend, frontend, and automated tests for each slice before moving on. Code across the stack will be written in TypeScript, organized into clean, modular layers that follow DRY, KISS, and other maintainable engineering practices. Prisma will consume the existing schema located at `db/schema.sql`.

---

## Setup & Foundations
- **Backend**
  - Initialize a monorepo structure (`apps/api`, `apps/web`, `packages/*` as needed).
  - Bootstrap Express/TypeScript project with Prisma, Zod, BullMQ, and shared utility modules.
  - Configure Prisma schema by importing table definitions from `db/schema.sql` (use migrations to stay in sync).
  - Wire Docker Compose services (Postgres, Redis, API, Worker, Web, Nginx) for dev parity.
  - Add environment management (.env validation, config loader).
  - Instrument logger, request tracing middleware, global error handler.
- **Frontend**
  - Scaffold Next.js (App Router) TypeScript project with ESLint, Prettier, Tailwind (or equivalent) and shared UI library.
  - Establish layout, provider setup (auth context, data fetching client).
  - Define API client typed via OpenAPI/TypeScript interfaces.
- **Tests**
  - Set up Jest/Vitest (backend) and Jest + React Testing Library (frontend).
  - Add coverage reporting (target ≥70% by MVP).
  - Seed initial smoke tests (health check endpoint, base page render).

---

## Feature 1: Authentication, Roles, Settings
- **Backend**
  - Implement email/password auth with Prisma models (`users`, `password_reset_tokens`).
  - Add session/token strategy (likely JWT or session cookies) with role-based guards (`admin`, `approver`).
  - Build endpoints for login, logout, password reset initiation, password update.
  - Create admin-only user management (create/activate/deactivate accounts).
  - Expose settings CRUD for RPM cap, worker concurrency, queue provider, safety factor, API bearer token rotation.
- **Frontend**
  - Build Bangla-only auth screens (login, request reset, reset confirmation).
  - Admin settings dashboard with forms for queue settings, API token display/regeneration, user management screens.
  - Implement protected route handling and role-aware navigation.
- **Tests**
  - Unit tests for auth services (hashing, validation, token generation).
  - Integration tests for auth routes (successful login, invalid creds, role restrictions).
  - Frontend component tests for forms (validation, error states).

---

## Feature 2: Taxonomy & Storage Configuration
- **Backend**
  - Implement CRUD APIs for class levels, subjects (with code validation), chapters (ordinal uniqueness).
  - Enforce relational integrity and audit fields (`created_at`, `updated_at` triggers already in schema).
  - Seed required defaults (class levels 6–10) on bootstrap.
- **Frontend**
  - Admin UI to manage subjects/chapters (tables + forms) with Bangla labels.
  - Validation for subject code format (`^[A-Z]{2}$`) and chapter ordinal uniqueness.
- **Tests**
  - Service-level tests to validate schema constraints (subject code, chapter ordinal).
  - API tests ensuring role-based access (admin only).
  - Frontend tests for taxonomy forms (duplicate chapter guard, validation messaging).

---

## Feature 3: PDF Upload & Page Rasterization
- **Backend**
  - Build PDF upload endpoint with file size (≤20 MB) and page-count (≤100) validation.
  - Implement classification metadata capture (class, subject, chapter selection).
  - Integrate rasterization worker (e.g., `pdf-poppler`/`pdfium` in job) to produce 300 DPI PNG and JPEG thumbnail per page.
  - Store S3 objects (original PDF, page images, thumbnails) and persist metadata in `uploads` and `pages`.
  - Generate signed URLs via AWS SDK wrappers.
- **Frontend**
  - Upload flow: multi-step form for classification, file validation, progress feedback.
  - Chapter gallery showing rasterization status per page.
- **Tests**
  - Backend unit tests for upload validation, S3 key naming, and rasterization job orchestrator (mocked).
  - Integration test simulating upload → page records creation.
  - Frontend tests covering upload flow (file type, size, success/failure messaging).

---

## Feature 4: LLM Generation Pipeline
- **Backend**
  - Define BullMQ queues and workers for per-page generation respecting rate limits (30 RPM) and concurrency (5).
  - Implement Gemini 2.5 Flash client with prompt + schema enforcement (Zod validation, retry policy).
  - Persist questions in `questions` table with `line_index`, difficulty, language detection/propagation.
  - Log attempts in `page_generation_attempts` and `llm_usage_events`, storing request/response excerpts on failure.
  - Provide API to requeue failed pages and regenerate pages (hard replace prior questions).
- **Frontend**
  - Generation dashboard per upload/chapter showing queue state, status breakdown, regenerate/retry actions.
  - Surface attempt logs and error messages for editors.
- **Tests**
  - Unit tests for rate limiter, retry backoff, schema validation path.
  - Worker integration test mocking Gemini responses (success, invalid schema, failures).
  - Frontend tests to cover regenerate workflows and status filtering.

---

## Feature 5: Editorial Review & Question Bank
- **Backend**
  - CRUD endpoints for questions with status transitions (`not_checked`, `approved`, `rejected`, `needs_fix`).
  - Implement bulk actions, page-level regenerate lock, and `publish_question` helper to enforce immutability (`is_locked_after_add`).
  - Expose sorting/filtering APIs (class/subject/chapter/page, status).
  - Manage question bank entries including printable codes (`subj_short_code`, sequence generation).
- **Frontend**
  - Reviewer workspace (Bangla UI) listing questions by filters with inline editing, bulk actions, and status badges.
  - Publish flow with confirmation and locked state indicators.
  - Visual differentiation of Question Bank items and ability to view linked page image via pre-signed URL.
- **Tests**
  - Backend service tests for publish flow (lock enforcement, sequence assignment).
  - API tests validating bulk operations and permissions (approver vs admin).
  - Frontend tests on edit forms, bulk action selectors, and locked-question messaging.

---

## Feature 6: Export & Internal API
- **Backend**
  - Implement CSV/JSON export endpoints using `v_export_questions` and `v_export_question_bank`.
  - Build internal REST API with static bearer token (filter by class/subject/chapter/page).
  - Generate pre-signed URLs for assets where needed during exports.
- **Frontend**
  - Export UI allowing selection of filters and download format (CSV/JSON).
  - Admin screen to reveal/rotate the API bearer token and instructions for consumer app.
- **Tests**
  - Backend tests verifying export schema alignment and bearer-token authorization.
  - Frontend tests ensuring export actions call correct endpoints and handle large results gracefully.

---

## Feature 7: Observability, Alerts, and Ops
- **Backend**
  - Implement request logging, structured job metrics, and LLM cost tracking.
  - Integrate AWS SES email alerts for errors and password reset emails (sandbox-aware).
  - Add `/healthz` endpoint for container orchestration checks.
  - Document deployment runbooks (EC2 + Docker, RDS, S3/CloudFront) and GitHub Actions pipelines per requirement.
- **Frontend**
  - Admin-only view to inspect queue metrics and recent errors (reads from backend endpoints).
- **Tests**
  - Unit tests for mailer service (mock SES), logging utilities, and health checks.
  - Automation tests for GitHub Actions workflows (lint/build/test jobs under CI).

---

## Testing Strategy & Quality Gates
- Maintain ≥70% unit test coverage across backend and frontend.
- Add integration tests for critical workflows (auth, upload → generate → review → publish).
- Configure linting (ESLint) and formatting (Prettier) enforced via CI.
- Include type checks (`tsc --noEmit`) and Prisma schema validation in pipelines.

---

## Best Practices Checklist
- Modular architecture: domain services, controllers, repositories separated.
- Shared TypeScript types between API and frontend via generated SDK or shared **package**.
- DRY: centralize constants (statuses, difficulty ratios) and reusable UI components.
- KISS: simple, predictable APIs and business logic; avoid premature abstraction.
- Security: validate inputs with Zod, sanitize outputs, manage secrets via env/config layers, enforce HTTPS in production (Nginx + TLS).
- Documentation: keep endpoint references and setup instructions updated alongside README/plan.
