# API app — environment examples

This file lists recommended environment variables for running the API locally and in production when using Google GenAI.

## Credentials

- `GOOGLE_APPLICATION_CREDENTIALS` — path to service account JSON (preferred for SDK), e.g.
  - `GOOGLE_APPLICATION_CREDENTIALS=/home/you/service-account.json`
- or `GOOGLE_API_KEY` — API key (only required if you use REST fallback; SDK recommended)

## GenAI model mapping

We use four internal model keys in the scheduler and code: `g2.5-flash`, `g2.5-flash-lite`, `g2.0-flash`, `g2.5-pro`.
Map them to provider model names using these env vars (optional — defaults provided):

- `GENAI_MODEL_FLASH` — e.g. `gemini-2.5-flash`
- `GENAI_MODEL_FLASH_LITE` — e.g. `gemini-2.5-flash-lite`
- `GENAI_MODEL_2_0` — e.g. `gemini-2.0-flash`
- `GENAI_MODEL_PRO` — e.g. `gemini-2.5-pro`

Example (.env):

```
GOOGLE_APPLICATION_CREDENTIALS=./gcloud-service-account.json
GOOGLE_GENAI_MODEL=gemini-2.5-flash
GENAI_MODEL_FLASH=gemini-2.5-flash
GENAI_MODEL_FLASH_LITE=gemini-2.5-flash-lite
GENAI_MODEL_2_0=gemini-2.0-flash
GENAI_MODEL_PRO=gemini-2.5-pro
```

## Scheduler tuning

- `LLM_SAFETY_FACTOR` (default `1.2`) — multiplier for token estimates
- `LLM_MIN_TOKENS_PER_REQ` (default `1500`) — minimum tokens per vision request

## Worker and Redis

- `WORKER_CONCURRENCY` (default `5`)
- `REDIS_URL` (e.g., `redis://127.0.0.1:6379`)

## Other helpful envs

- `S3_BUCKET_UPLOADS` — name of uploads bucket
- `AWS_REGION` — AWS region

---

If you want me to, I can add a `scripts/setup-dev.sh` that checks credentials and prints quickstart commands.
