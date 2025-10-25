-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'approver');

-- CreateEnum
CREATE TYPE "question_status" AS ENUM ('not_checked', 'approved', 'rejected', 'needs_fix');

-- CreateEnum
CREATE TYPE "difficulty_level" AS ENUM ('easy', 'medium', 'hard');

-- CreateEnum
CREATE TYPE "page_status" AS ENUM ('pending', 'queued', 'generating', 'complete', 'failed');

-- CreateEnum
CREATE TYPE "option_key" AS ENUM ('a', 'b', 'c', 'd');

-- CreateEnum
CREATE TYPE "language_code" AS ENUM ('bn', 'en');

-- CreateTable
CREATE TABLE "class_levels" (
    "id" SMALLINT NOT NULL,
    "display_name" TEXT NOT NULL,

    CONSTRAINT "class_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" UUID NOT NULL,
    "class_id" SMALLINT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" SMALLINT NOT NULL DEFAULT 1,
    "rpm_cap" INTEGER NOT NULL DEFAULT 30,
    "worker_concurrency" SMALLINT NOT NULL DEFAULT 5,
    "queue_provider" TEXT NOT NULL DEFAULT 'bullmq',
    "rate_limit_safety_factor" REAL NOT NULL DEFAULT 0.8,
    "token_estimate_initial" INTEGER NOT NULL DEFAULT 3000,
    "api_bearer_token_hash" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_tokens" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uploads" (
    "id" UUID NOT NULL,
    "class_id" SMALLINT NOT NULL,
    "subject_id" UUID NOT NULL,
    "chapter_id" UUID NOT NULL,
    "uploaded_by" UUID,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "s3_bucket" TEXT NOT NULL,
    "s3_pdf_key" TEXT NOT NULL,
    "pages_count" INTEGER NOT NULL,
    "file_meta" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pages" (
    "id" UUID NOT NULL,
    "upload_id" UUID NOT NULL,
    "page_number" INTEGER NOT NULL,
    "language" "language_code",
    "status" "page_status" NOT NULL DEFAULT 'pending',
    "s3_png_key" TEXT NOT NULL,
    "s3_thumb_key" TEXT NOT NULL,
    "last_generated_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL,
    "page_id" UUID NOT NULL,
    "class_id" SMALLINT NOT NULL,
    "subject_id" UUID NOT NULL,
    "chapter_id" UUID NOT NULL,
    "language" "language_code" NOT NULL,
    "difficulty" "difficulty_level" NOT NULL,
    "stem" TEXT NOT NULL,
    "option_a" TEXT NOT NULL,
    "option_b" TEXT NOT NULL,
    "option_c" TEXT NOT NULL,
    "option_d" TEXT NOT NULL,
    "correct_option" "option_key" NOT NULL,
    "explanation" TEXT NOT NULL,
    "status" "question_status" NOT NULL DEFAULT 'not_checked',
    "line_index" INTEGER NOT NULL,
    "is_locked_after_add" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "reviewed_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_bank" (
    "id" UUID NOT NULL,
    "source_question_id" UUID,
    "class_id" SMALLINT NOT NULL,
    "subject_id" UUID NOT NULL,
    "chapter_id" UUID NOT NULL,
    "page_id" UUID,
    "language" "language_code" NOT NULL,
    "difficulty" "difficulty_level" NOT NULL,
    "stem" TEXT NOT NULL,
    "option_a" TEXT NOT NULL,
    "option_b" TEXT NOT NULL,
    "option_c" TEXT NOT NULL,
    "option_d" TEXT NOT NULL,
    "correct_option" "option_key" NOT NULL,
    "explanation" TEXT NOT NULL,
    "added_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seq_no" INTEGER,
    "subj_short_code" TEXT,

    CONSTRAINT "question_bank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_generation_attempts" (
    "id" UUID NOT NULL,
    "page_id" UUID NOT NULL,
    "attempt_no" SMALLINT NOT NULL,
    "model" TEXT NOT NULL,
    "prompt_version" TEXT NOT NULL,
    "is_success" BOOLEAN NOT NULL DEFAULT false,
    "error_message" TEXT,
    "request_excerpt" TEXT,
    "response_excerpt" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_generation_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_usage_events" (
    "id" UUID NOT NULL,
    "page_id" UUID,
    "attempt_id" UUID,
    "model" TEXT NOT NULL,
    "tokens_in" INTEGER,
    "tokens_out" INTEGER,
    "estimated_cost_usd" DECIMAL(10,5),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "llm_usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject_counters" (
    "class_id" SMALLINT NOT NULL,
    "subject_id" UUID NOT NULL,
    "next_val" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "subject_counters_pkey" PRIMARY KEY ("class_id","subject_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_subject_per_class" ON "subjects"("class_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "uq_chapter_ordinal_per_subject" ON "chapters"("subject_id", "ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "api_tokens_token_hash_key" ON "api_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_uploads_chapter" ON "uploads"("chapter_id");

-- CreateIndex
CREATE INDEX "idx_uploads_created_at" ON "uploads"("created_at");

-- CreateIndex
CREATE INDEX "idx_pages_upload" ON "pages"("upload_id");

-- CreateIndex
CREATE INDEX "idx_pages_status" ON "pages"("status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_page_per_upload" ON "pages"("upload_id", "page_number");

-- CreateIndex
CREATE INDEX "idx_questions_page" ON "questions"("page_id");

-- CreateIndex
CREATE INDEX "idx_questions_status" ON "questions"("status");

-- CreateIndex
CREATE INDEX "idx_questions_taxonomy_status" ON "questions"("class_id", "subject_id", "chapter_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_line_index_per_page" ON "questions"("page_id", "line_index");

-- CreateIndex
CREATE INDEX "idx_qb_taxonomy" ON "question_bank"("class_id", "subject_id", "chapter_id");

-- CreateIndex
CREATE INDEX "idx_qb_created_at" ON "question_bank"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_qb_seq_per_subject_class" ON "question_bank"("class_id", "subject_id", "seq_no");

-- CreateIndex
CREATE UNIQUE INDEX "uq_qb_subj_short_code" ON "question_bank"("subj_short_code");

-- CreateIndex
CREATE INDEX "idx_attempts_page" ON "page_generation_attempts"("page_id");

-- CreateIndex
CREATE INDEX "idx_attempts_created_at" ON "page_generation_attempts"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_attempt_per_page" ON "page_generation_attempts"("page_id", "attempt_no");

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_source_question_id_fkey" FOREIGN KEY ("source_question_id") REFERENCES "questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bank" ADD CONSTRAINT "question_bank_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_generation_attempts" ADD CONSTRAINT "page_generation_attempts_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_usage_events" ADD CONSTRAINT "llm_usage_events_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_usage_events" ADD CONSTRAINT "llm_usage_events_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "page_generation_attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_counters" ADD CONSTRAINT "subject_counters_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject_counters" ADD CONSTRAINT "subject_counters_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
