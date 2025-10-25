# Cursor Rules for NCTB Quiz Generator

Below are workspace rules, conventions, and guardrails to align development with the delivery plan and MVP requirements.

1. Repository layout

   - Use a monorepo layout with `apps/api`, `apps/web`, `packages/*`.

2. Languages & Tooling

   - TypeScript across backend and frontend.
   - Backend: Express, Prisma, Zod, BullMQ.
   - Frontend: Next.js (App Router), Tailwind, React Testing Library.

3. Environment & Secrets

   - Keep secrets out of git; use `.env.local` for local development and environment-specific secret stores in production.
   - Required env vars: `DATABASE_URL`, `REDIS_URL`, `AWS_REGION`, `S3_BUCKET_UPLOADS`, `INTERNAL_API_BEARER`, `SES_FROM`.

4. Database & Prisma

   - Prisma must use `db/schema.sql` as the canonical schema. Use migrations to sync changes.
   - Production and local use the same DB name `enayet`, but different schemas (`quiz_gen`, `quiz_gen_shadow`).

5. Uploads & Storage

   - Validate uploads: max **20 MB**, max **100 pages**.
   - Store original PDFs and generated PNGs/thumbnails in S3 with stable keys. Serve via pre-signed URLs.

6. LLM Pipeline

   - Use BullMQ with Redis; enqueue one job per page.
   - Global rate limit: **30 RPM**; worker concurrency: **5**.
   - Retry policy: 3 attempts with exponential backoff (5s, 15s, 45s) + jitter.
   - Persist failures and request/response excerpts for debugging.

7. Prompting & Validation

   - Store prompt versions and enforce Zod schema validation of LLM outputs.
   - Reject outputs failing validation; count as attempts.

8. Editorial Workflow

   - Question statuses: `not_checked`, `approved`, `rejected`, `needs_fix`.
   - Adding to Question Bank creates an immutable copy and locks the source.

9. Exports & API

   - Provide CSV/JSON exports per schema.
   - Internal API uses static bearer token stored in `INTERNAL_API_BEARER`.

10. Testing & Quality Gates

    - Target ≥70% test coverage; run `tsc --noEmit` in CI.
    - Include unit and integration tests for critical flows (auth, upload→generate→review→publish).

11. CI/CD & Deployment

    - Use GitHub Actions: build → deploy backend to EC2 (SSH/rsync) and frontend to S3 (next export).
    - Use Docker Compose for local dev parity (postgres, redis, api, worker, web, nginx).

12. Observability & Alerts

    - Implement structured request logging and job metrics.
    - Use SES for password reset and error alerts (verify `SES_FROM`).

13. Security

    - Enforce password policy: min 8 chars, include letter and number.
    - Pre-signed S3 URLs for asset access; bind Redis to localhost/private IP.

14. Coding Conventions

    - Shared types in `packages/*` and generate SDK for frontend consumption.
    - Validate inputs with Zod; avoid catching errors silently.
    - **No `any` rule:** Do not use `any` in the codebase. Prefer explicit typing and typed helper wrappers. For library type mismatches (e.g., `pino` + `pino-http`), use correctly-parameterized generic types rather than `any`.
    - Example: prefer `import pino, { Logger as PinoLogger } from 'pino'; const logger: PinoLogger<never, boolean> = pino(...)` over casting to `any`.

15. Localization

    - UI language: Bangla-only for editorial UI; internal docs and plan in English.

16. Acceptance checks (pre-release)

    - Upload a 20MB 100-page PDF → pages PNGs + thumbnails in S3 with presigned URLs.
    - Generation respects 30 RPM and 5 concurrency; retry policy and error logs present.
    - Editorial flows: filters, bulk actions, publish creates locked copy.

17. Onboarding notes
    - Run `docker compose up` for local dev.
    - Seed classes 6–10 on first run.
    - Use `scripts/` for common tasks: `start:dev`, `migrate`, `seed`, `test`.

Please review and tell me if you'd like me to split these into separate `CONTRIBUTING.md` and `OPERATIONS.md` files.
