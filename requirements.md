# NCTB Quiz Generator – MVP Requirements 



**Environment/Region:** AWS ap-south-1 (Mumbai)

---

## 1) Project Summary
Build an internal web application to (a) ingest chapter-wise NCTB PDFs, (b) rasterize each page into images, (c) send each page image to Gemini (2.5 Flash) to generate MCQs (~1 per text line), (d) queue, validate, and store questions, (e) provide a Bangla-only editorial UI to review/edit/approve, (f) publish approved items into a separate Question Bank, and (g) expose exports (CSV/JSON) and an internal REST API for a separate consumer app. No student-facing features in this system.

**MVP Goal:** All of the above (bulk generation, human review/editing, export + API).

**Success:** Delivery of the full app that satisfies the acceptance criteria in §17.

---

## 2) In Scope (MVP)
1. **PDF ingest** (chapter-wise, scanned images) → **300 DPI PNG** per page + JPEG thumbnails for UI.
2. **LLM generation** using **Gemini 2.5 Flash** (vision) with **low temperature**; ~1 question per line; exactly **4 options**, **1 correct**, **short explanation**.
3. **Language policy:** Bangla pages ⇒ Bangla questions; English pages ⇒ English questions.
4. **Line handling:** Instruct LLM to **ignore page numbers, headings, captions** and **skip lines < 20 chars**.
5. **Queue + retries:** BullMQ (Redis) default; max **3 attempts** with exponential backoff + jitter; system-wide **30 RPM** rate cap; failures recorded.
6. **Validation:** Strict Zod schema validation; any invalid output **counts as an attempt** (no auto-structure-retry beyond the 3 total).
7. **Review UI:** Bangla-only; CRUD for question/answers/explanation; bulk actions (approve/reject/needs-fix/add/delete). Sorting by internal `line_index`.
8. **Regeneration:** Page-level regenerate **hard-replaces** previous page questions.
9. **Publishing:** “Add” pushes a **copy** into a **Question Bank** table; once added, **source question locked** from further edits.
10. **Exports:** CSV & JSON for selected/filtered sets (schema in §12).
11. **API:** Internal REST with static bearer token for the consumer app.
12. **Auth:** Email/password (password reset link); **Admin-only** account creation; roles: **Admin** + **Approver**.
13. **Infra:** Frontend on AWS (S3 + CloudFront); Backend on **EC2**; Redis via **ElastiCache** if free-tier; otherwise **self-host Redis on EC2**; DB: **PostgreSQL on RDS**.
14. **Observability:** Email alerts for errors; request logs; job metrics; LLM cost tracking (basic).

---

## 3) Out of Scope (MVP)
- OCR and text-level line detection.
- Topic/subtopic tagging.
- Student app or quiz play UI.
- Public APIs or rate-limited 3rd party consumption.
- Compare/diff view across generations.
- Image attachments to questions (deferred to later stage).
- SSO (Google) and MFA.

---

## 4) Users & Roles
- **Total users at launch:** 5
- **Admin (1):** Manage classes/subjects/chapters, upload PDFs, trigger generation, manage users and environment settings, export, access API key.
- **Approver (4):** Review/edit questions, set statuses, regenerate per question or per page, bulk actions, export.

**Permissions summary**
- Admin: Full access + user management.
- Approver: Editorial + publishing; cannot manage users.

---

## 5) Content Ingestion
- **Upload constraints:** per file ≤ **20 MB**, ≤ **100 pages** per chapter PDF.
- **Classification (mandatory before processing):** User selects **Class (6–10) → Subject → Chapter**.
- **Rasterization:** Each page to **PNG @ 300 DPI** (lossless), plus auto-generated **JPEG thumbnail** for faster UI.
- **Storage:** Original PDF + page PNG + thumbnail stored in **S3**. UI and API serve **pre-signed URLs** (e.g., 24h TTL).

---

## 6) Generation Pipeline
1. **Enqueue** a job per **page**.
2. **Gemini 2.5 Flash** receives the **page image** and a structured prompt.
3. Model instructed to:
   - Read visual text only; ignore headers/footers/captions.
   - Skip lines with < 20 characters.
   - Generate **~1 MCQ per valid line** with exactly 4 options, 1 correct, and a short explanation.
   - Language: same as page language (Bangla for Bangla pages; English for English pages).
   - Difficulty distribution (per page total): ~**50% easy**, **30% medium**, **20% hard**.
4. **Validation:** Zod schema check; single-correct; structure and basic content checks.
5. **Persist:** Valid questions saved with references to **Class/Subject/Chapter/Page**.
6. **Status:** Newly generated items start as **Not Checked**.

**Retry Policy**
- Max **3 attempts** per page; failed attempts include validation failures.
- **Backoff:** 5s, 15s, 45s (+ jitter).
- **Rate limit:** **adaptive multi-model cap (§21)**.
- **On repeated failure:** Store full error context (model, prompt version, request/response excerpts, attempt count, timestamps). Editors can **requeue** failed pages.

---

## 7) Review & Editorial Workflow
**Statuses:** `not_checked` (default), `approved`, `rejected`, `needs_fix`.

**Actions (single & bulk):**
- Approve / Reject / Needs-fix / Delete
- **Regenerate**: per-question (retry with same line instruction) and **entire page** (hard-replace all for that page)
- **Edit**: question stem, 4 options, correct option, explanation (except items already **Added** to Question Bank)
- **Add to Question Bank** (publish copy)

**Sorting & Filters:**
- Filters: Approved / Not Checked only (per requirements)
- Views: by Page, Chapter, Subject
- Sorting: by internal `line_index` (preserving page reading order)

**Language:** UI is **English-only**.

---

## 8) Publishing (Question Bank)
- **Add** creates a **copy** in the **Question Bank** with references (Class, Subject, Chapter, Page).
- After Add, the **source item becomes read-only** (no further edits).
- Bulk Add supported.

---

## 9) Retrieval & Export
**Front-end fetch (read views):**
- All **approved** questions of a **page/chapter/subject**
- All **not checked** questions of a **page/chapter/subject**

**Exports:** CSV/JSON with fields:
- `question_id, class, subject, chapter, page, language, difficulty, stem, option_a, option_b, option_c, option_d, correct_option, explanation, status, created_at, source_page_image_url`

---

## 10) Internal API (for Consumer App)
- **Auth:** Static bearer token (Admin-manageable).
- **Endpoints (illustrative):**
  - `GET /api/questions/approved?class=&subject=&chapter=&page=` – paginated.
  - `GET /api/question-bank/export.(csv|json)` – by filters.
  - `GET /api/health` – liveness.

(Exact OpenAPI/paths will be finalized during implementation.)

---

## 11) Data Model (High-Level)
**Core entities:**
- **Class** (id, name: 6–10) – admin-managed list.
- **Subject** (id, name, class_id) – admin-managed.
- **Chapter** (id, name, subject_id, ordinal)
- **Upload** (id, class_id, subject_id, chapter_id, file_meta, pages_count)
- **Page** (id, upload_id, page_number, s3_png_url, s3_thumb_url, status)
- **Question** (id, page_id, class_id, subject_id, chapter_id, language, difficulty, stem, options[a–d], correct_option, explanation, status, line_index, is_locked_after_add)
- **QuestionBank** (id, source_question_id, class_id, subject_id, chapter_id, page_id, language, difficulty, stem, options[a–d], correct_option, explanation, created_at)
- **JobLog / GenError** (page_id, attempt_no, model, prompt_version, error_message, request_excerpt, response_excerpt, timestamps)
- **User** (id, email, role: Admin/Approver, password_hash)
- **Settings** (rpm_cap, worker_concurrency, queue_provider, etc.)

> Note: `line_index` is stored for ordering but **omitted from exports**.

---

## 12) Prompting (Illustrative Skeleton)
- System: "You are generating MCQs from a single textbook page image. Read the text only; ignore headers/footers/captions; skip lines < 20 chars…"
- User content: **page image** (PNG)
- Instructions: **Language** = Bangla if page text is Bangla; English if English. **Difficulty distribution** per page = 50/30/20 (easy/medium/hard). For each eligible line, produce one MCQ with 4 options, exactly one correct, and a short explanation. Return JSON in strict schema: `{ questions: [ { stem, options: {a,b,c,d}, correct_option, explanation, difficulty } ] }`.

(Exact prompt + schema will be versioned and stored.)

---

## 13) Non-Functional Requirements
- **Performance:** list/detail API p95 ≤ **300ms** on cached queries.
- **Throughput:** monthly ingest ≈ **2000 pages**; peak concurrent generation input: **200 pages** queued; worker concurrency capped at **5**.
- **Rate limiting:** Gemini requests capped to **30 RPM** global.
- **Availability:** Best effort within free-tier constraints; single-AZ acceptable for MVP.
- **Security:**
  - Pre-signed S3 URLs for images.
  - Password policy: min 8 chars, must include letter & number.
  - Secrets in env/parameter store; API bearer token for consumer app.
- **Data retention:** Indefinite (as per client) unless manually deleted.
- **Delete semantics:** **Hard delete** for questions and regenerated page replacements.
- **Localization:** UI Bangla-only.
- **Accessibility:** Reasonable keyboard navigation and contrast in editor.

---


## 14) Infrastructure & DevOps

**Deployment stance:** Local-first development and testing → then deploy to **AWS** using only **free-tier–eligible** options. Both **frontend** and **backend** run on AWS. DNS remains at **Hostinger** (subdomain). **Redis** is self-hosted on EC2 (no ElastiCache).

### 14.0 Local-first (dev)
- Use **Docker Compose** for parity:
  - `postgres:16` with database **enayet** and schema **quiz_gen`
  - `redis:7` (local cache + BullMQ queue)
  - Backend (Express/TS)
  - Frontend (Next.js, App Router)
- Prisma env (local example):
  ```env
  DATABASE_URL="postgresql://USER:PASS@localhost:5432/enayet?schema=quiz_gen"
  SHADOW_DATABASE_URL="postgresql://USER:PASS@localhost:5432/enayet?schema=quiz_gen_shadow"
  ```
  > Note: We intentionally use **the same DB name with separate schemas** for primary and shadow in local to match production constraints.

### 14.1 AWS Deployment (free-tier only)
#### Networking & security
- **VPC** with a public subnet (EC2) and a private subnet (RDS).
- **Security Groups:**
  - EC2 SG: allow **80/443** from world; restrict outbound DB access (5432) to RDS SG.
  - RDS SG: allow **5432 inbound** **only** from EC2 SG.
  - Redis on EC2: bind to `127.0.0.1` (or private IP); **no public access**.

#### Compute
- **EC2** (Amazon Linux 2023; free-tier eligible micro instance).
  - Host **Backend (Express/TS)** + **Redis** on the same instance.
  - Reverse proxy with **Nginx**; TLS via **Let’s Encrypt** (`certbot`).

#### Database (RDS PostgreSQL)
- Single **RDS Postgres** instance (free-tier eligible), with **one database name**: **enayet**.
- Use **multiple schemas** inside `enayet` for app segregation:
  - `quiz_gen`  (this project – primary schema)
  - `quiz_gen_shadow` (Prisma shadow schema)
  - (future apps can add more schemas under the same DB name)
- Prisma production env (RDS example):
  ```env
  DATABASE_URL="postgresql://USER:PASS@<rds-endpoint>:5432/enayet?schema=quiz_gen"
  SHADOW_DATABASE_URL="postgresql://USER:PASS@<rds-endpoint>:5432/enayet?schema=quiz_gen_shadow"
  ```
  **Caution:** Prisma’s migration engine typically prefers a **separate database** for the shadow. We are proceeding with **separate schemas on the same DB** per requirement. To mitigate risks:
  - Use **distinct DB roles** with minimal privileges for migrations vs runtime.
  - Ensure `search_path` is pinned via the connection string (`?schema=...`) so migrations are isolated.
  - Avoid cross-schema dependencies; run `prisma migrate deploy` during maintenance windows.

#### Object storage & static site
- **S3** for:
  - Uploaded chapter PDFs, page PNGs, and thumbnails (served via **pre-signed URLs**).
  - **Frontend** (Next.js) built as a **static export** and uploaded to S3.
- **CloudFront** in front of S3 for the frontend; **ACM** certificate (free) in us-east-1 for HTTPS.

#### Email
- **AWS SES** for password reset and error-alert emails; verify sender `enayetflweb@gmail.com`. Sandbox limits apply until production access is granted.

#### DNS & TLS (Hostinger subdomain)
- Keep DNS at **Hostinger** (no Route 53 hosted zone costs).
- Create records:
  - `app.<your-domain>` → **CloudFront** (CNAME)
  - `api.<your-domain>` → **EC2** (CNAME to public DNS or A to Elastic IP)
- TLS:
  - Frontend (CloudFront) → **ACM** managed cert
  - Backend (EC2) → **Let’s Encrypt**

#### Cache & Queue
- **Redis**: self-hosted on the same EC2 instance (systemd or Docker). No ElastiCache (not free).
- **BullMQ** for job queue; Redis secured to localhost/private IP only.

#### CI/CD (no paid services)
- **GitHub Actions**:
  - Backend: build → SSH/rsync to EC2 → restart via `pm2` or `systemd` → `prisma migrate deploy`.
  - Frontend: build (`next export`) → sync to S3 → CloudFront invalidation.
- Environments: **dev**, **prod** (local remains the primary development loop).

#### Environment variables (production examples)
```env
NODE_ENV=production
PORT=3000

# Postgres (RDS)
DATABASE_URL="postgresql://USER:PASS@<rds-endpoint>:5432/enayet?schema=quiz_gen"
SHADOW_DATABASE_URL="postgresql://USER:PASS@<rds-endpoint>:5432/enayet?schema=quiz_gen_shadow"

# Redis (self-hosted on EC2)
REDIS_URL="redis://127.0.0.1:6379"

# AWS
AWS_REGION="ap-south-1"
S3_BUCKET_UPLOADS="your-upload-bucket"
S3_BUCKET_SITE="your-frontend-bucket"
S3_SIGN_TTL_SEC="86400"

# SES / Email
SES_FROM="enayetflweb@gmail.com"

# API auth for consumer app
INTERNAL_API_BEARER="<<long-random>>"

# LLM scheduler
SAFETY_FACTOR="0.8"
```

---

**Summary:**
- **Local-first** for speed and safety.
- Single **RDS DB name `enayet`** with **multiple schemas**; Prisma shadow uses **`quiz_gen_shadow`** on the same DB, with guardrails.
- **EC2** hosts backend and **self-hosted Redis** (free).
- **S3 + CloudFront** host the frontend (free-tier friendly).
- **Hostinger DNS** maps subdomains to CloudFront (app) and EC2 (api) with full TLS.

## 15) Observability & Alerts
- **Request logging** (API, generation jobs).
- **Job metrics** (queued, processing, succeeded, failed).
- **Error alerts via Email** (SES). Daily job/cost summary email optional.

---

## 16) UI Flows (English)
1. **Login → Dashboard**
2. **Upload Chapter PDF** → Select Class/Subject/Chapter → Validate constraints → Confirm → Queue pages
3. **Pages List** (chapter)
   - Show generation status per page (queued/processing/succeeded/failed)
   - Actions: Retry failed page, Regenerate page (hard-replace)
4. **Questions Review** (page/chapter/subject views)
   - Filters: Approved / Not Checked
   - Bulk actions: Approve / Reject / Needs-fix / Delete / Add to Question Bank
   - Edit in place (stem/options/explanation/correct) unless already added to Question Bank
5. **Exports**: CSV/JSON by current filter
6. **Settings** (Admin): Users, RPM cap (read-only at MVP), Queue provider (read-only at MVP), API token, SES sender display name

---

## 17) Acceptance Criteria (Sign-off)
1. Uploading a 20MB, 100-page PDF succeeds; pages appear with PNGs and thumbnails in S3; pre-signed URLs work.
2. Generation pipeline processes pages respecting **30 RPM** cap and **5 worker concurrency**; retries and error logging function as specified.
3. For a typical Bangla page with multiple lines, generated MCQs:
   - Are Bangla; 1 per eligible line; 4 options; 1 correct; short explanation; difficulty distributed ~50/30/20.
   - Failures logged and visible; manual requeue works.
4. Editor can view **Not Checked** and **Approved** sets by page/chapter/subject; sorting follows reading order.
5. Bulk actions (approve/reject/needs-fix/add/delete) work; per-question and per-page regenerate works; page regenerate **hard-replaces**.
6. Adding to Question Bank creates a **locked** source item and a **published copy**.
7. CSV/JSON export matches the schema in §9.
8. Internal API with bearer token returns approved questions filtered by class/subject/chapter/page.
9. Auth: Admin-only user creation; password reset email works via SES (subject to SES sandbox rules).
10. Deployment on AWS (EC2 + RDS + S3 + CloudFront + Redis) with dev and prod environments; GitHub Actions CI/CD runs successfully.

---

## 18) Timeline & Milestones (Target: 1 Week)
- Day 1–2: Infra setup (dev), data model, ingestion & rasterization, S3 wiring, SES setup.
- Day 2–3: Queue + LLM pipeline + validation, RPM cap; basic editor UI scaffolding.
- Day 4: Review flows (filters, bulk actions, edit, regenerate), Question Bank, exports.
- Day 5: API for consumer app, auth + password reset, settings page, error emails.
- Day 6: Hardening, seed data, performance checks, documentation.
- Day 7: Deploy to prod, UAT, fixes, sign-off.

> **Note:** AWS free-tier constraints (RDS, SES sandbox, ElastiCache) may affect throughput/email deliverability. We’ll default to self-hosted Redis on EC2 if ElastiCache isn’t free-tier eligible. SES sender must be verified; sandbox mode may restrict recipient domains until production access is approved.

---

## 19) Assumptions & Constraints
- Client has rights to process NCTB content with a cloud LLM.
- Gemini 2.5 Flash vision API quota is available for the target RPM and daily volume.
- No legal/data residency constraints; indefinite retention permitted.
- Only internal reviewers use this system (no minors, no student data).

---

## 20) Phase Plan (High‑Level)
### Phase 0 — Foundations (Repo, CI, Runtime)
- Monorepo, Docker Compose (api, worker, web, redis, nginx), GitHub Actions pipeline
- Env templates, Nginx, CORS allowlist

### Phase 1 — Auth, Roles, Settings
- Email+password, SES reset (sandbox), Admin/Approver roles
- Settings: **Rotate Bearer Token**

### Phase 2 — Taxonomy & Storage
- CRUD: Class → Subject → Chapter
- S3 buckets with **stable keys**

### Phase 3 — PDF Upload → Page Images
- Upload PDF → S3 (original) → rasterize → Page rows with image S3 keys
- Chapter page gallery

### Phase 4 — LLM Generation Pipeline
- BullMQ queue; concurrency **5**; **30 RPM** rate-limit
- DraftQuestion creation (NOT_CHECKED)

### Phase 5 — Review UI & Question Bank
- Filters: **All / Not Checked / Approved**, **stem search**
- Approve → Add to Question Bank (immutable), source read-only, hard deletes respected

### Phase 6 — Export & Consumer API
- Export CSV/JSON (**S3 keys**), Consumer API with Bearer auth (filters)

### Phase 7 — Docs, Testing, Security
- OpenAPI at `/openapi.json`, Swagger at `/docs`
- Unit test coverage: **≥70%** FE & BE
- Helmet, rate-limit, validation; logs & `/healthz`

### Phase 8 — Deploy & Handover
- CloudFront + custom domain (Hostinger DNS), EC2 dockerized services, RDS backups (7d)
- Admin creates initial users (1 Admin, 4 Approvers)
- Short runbook (backup/restore, token rotate, envs)

---

## 21) Adaptive Multi‑Model Rate Limiting (Gemini)

**Last updated:** 2025-10-26 14:13 UTC

**Purpose.** Replace fixed per‑minute caps with a scheduler that *maximizes throughput* while respecting each model’s **RPM** (requests/min), **TPM** (tokens/min), and **RPD** (requests/day) limits. This section supersedes any earlier fixed "30 RPM" references.

### Models & priorities
1) **Gemini 2.5 Flash** — **10 RPM**, **250,000 TPM**, **250 RPD** (primary)  
2) **Gemini 2.5 Flash‑Lite** — **15 RPM**, **250,000 TPM**, **1,000 RPD** (fallback)  
3) **Gemini 2.0 Flash** — **15 RPM**, **1,000,000 TPM**, **200 RPD** (final normal fallback)  
4) **Gemini 2.5 Pro** — **5 RPM**, **125,000 TPM**, **100 RPD** (**only** for pages that failed **≥2** times)

### Buckets & counters
We maintain buckets per model **m**:
- **Request/min bucket Aₘ** (RPM): fill‑rate `RPMₘ` / minute, capacity `RPMₘ`.
- **Token/min bucket Bₘ** (TPM): fill‑rate `TPMₘ` / minute, capacity `TPMₘ`.
- **Daily request bucket Cₘ** (RPD): adaptive fill‑rate `rpd_rateₘ = (RPDₘ − used_todayₘ) / minutes_left_today` (clamped ≥ 0), capacity `RPDₘ`.

A request on model **m** requires: **1** token from Aₘ, **T_eff** tokens from Bₘ, and **1** token from Cₘ.

**T_eff (effective tokens/request)** = `ceil(safety_factor × rolling_avg(input_tokens + output_tokens))`.  
- **safety_factor** default `1.2` (configurable).  
- `rolling_avg` computed over the last N (e.g., 100) page requests per model.

### Effective RPM per model (informational)
At any moment, the scheduler’s *admissible* per‑minute rate for a model **m** is:
```
rpm_by_rpmₘ = RPMₘ
rpm_by_tpmₘ = floor(TPMₘ / T_eff)
rpm_by_rpdₘ = floor(max(0, RPDₘ − used_todayₘ) / max(1, minutes_left_today))
rpm_modelₘ  = min(rpm_by_rpmₘ, rpm_by_tpmₘ, rpm_by_rpdₘ)
```
> Note: The **token buckets** avoid zero‑throughput rounding by accumulating fractional capacity; the formula above is a useful upper‑bound estimate.

### Scheduler logic (high‑level)
1. **Select model** for each job:
   - If `page.fail_count ≥ 2` ⇒ try **2.5 Pro** first; else follow priority **2.5 Flash → 2.5 Flash‑Lite → 2.0 Flash**.
2. **Try acquire tokens** (Aₘ: 1; Bₘ: T_eff; Cₘ: 1) on the chosen model.  
   - If any bucket lacks tokens, **try next model** in the allowed priority set for this page.  
   - If none available, **wait** until the earliest bucket refill time.
3. **Send request**, record token usage, update `used_todayₘ`.
4. **Daily reset** of `used_todayₘ` and Cₘ at **00:00 UTC** (provider day boundary).

### Concurrency & fairness
- Worker concurrency remains **5** (cap). The scheduler meters when each worker may *start* a call.  
- Pages with **2 prior failures** are **isolated** to use **2.5 Pro** only, so they don’t starve the main queue.
- Optional **fair‑share**: round‑robin across classes/chapters to avoid one large upload monopolizing capacity.

### Configuration (Settings table)
- `t_eff_safety_factor` (default **1.2**)  
- `min_tokens_per_req` (floor, default **1500**) — protects against under‑estimation for vision pages  
- Per‑model enable/disable flags (for emergency)  
- Timezone for dashboards is **Asia/Dhaka**, but quota **resets at 00:00 UTC**

### Example (illustrative)
Assume `T_eff = 3,000` tokens/request, **600 minutes** left today, and `used_today = 0`:
- **2.5 Flash**: `rpm_by_tpm = floor(250,000/3,000)=83`, `rpm_by_rpm=10`, `rpm_by_rpd=floor(250/600)=0` ⇒ model must **pace via C**; bucket C fills at ~`0.416 req/min`, allowing ~**1 request every ~2.4 min**, bursting up to **10 RPM** when A allows.
- **2.5 Flash‑Lite**: similar, but **RPD=1000** ⇒ `rpd_rate ≈ 1.66 req/min`, bounded by **15 RPM** and TPM.
- **2.0 Flash**: very large TPM, but **RPD=200** ⇒ `rpd_rate ≈ 0.33 req/min`.

The token buckets ensure we **utilize RPD over the whole day** while never exceeding **RPM** or **TPM**.

### Acceptance criteria (rate limiting)
- The system **never** exceeds any model’s **RPM**, **TPM**, or **RPD**.  
- With sustained backlog, the **daily completed requests** per model approach its **RPD** (±5%) without violations.  
- Pages with **≥2 failures** are attempted on **2.5 Pro** only and respect its caps.

