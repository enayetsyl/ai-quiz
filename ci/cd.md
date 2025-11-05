# CI/CD Guide - Quiz Tuition

This guide provides a detailed plan and ready-to-use workflows to automate backend deployments to AWS EC2 when you push to the GitHub `main` branch. The frontend is already auto-deployed by AWS Amplify. This document focuses on the backend API and workers living under `apps/api`.

---

## Architecture of the CI/CD

- Trigger: GitHub push to `main` (optionally path-filtered to `apps/api/**`)
- CI (GitHub Actions):
  - Option A (recommended for simplicity): SSH into EC2 and run deploy script (no Docker registry needed)
  - Option B (more scalable): Build and push Docker images to GHCR/Docker Hub; EC2 pulls and restarts with Watchtower or `docker-compose pull`
  - Option C (very reliable): Install a GitHub self-hosted runner on your EC2 and run deploy steps locally (no SSH key management)
- Deploy Steps on EC2:
  1. `git fetch/reset` to `origin/main`
  2. Stop previous containers
  3. Build images (or pull prebuilt)
  4. Run Prisma migrations
  5. Start containers
  6. Health check and rollback on failure

Notes:

- `.env` lives on EC2 at `~/quiz-tuition-deploy/.env` per the deployment guide.
- Docker Compose file: `~/quiz-tuition/apps/api/docker-compose.prod.yml`
- Health check endpoint: `http://localhost:4080/api/v1/health` (or `/healthz`)
- Zero-downtime can be added with blue/green or rolling (optional section below).

---

## Prerequisites

- EC2 instance with Docker, Docker Compose, Nginx/Certbot, repository cloned:
  - Repo dir (example): `~/quiz-tuition`
  - Compose file: `~/quiz-tuition/apps/api/docker-compose.prod.yml`
  - Env file: `~/quiz-tuition-deploy/.env`
- Git installed on EC2, upstream origin pointing to GitHub repo
- GitHub repository permissions to add Actions and Secrets
- Security groups opened for SSH (only from your IP), HTTP/HTTPS for Nginx

---

## Production Conventions

- Use `main` as deployment branch
- Git tags (optional) for release tracking
- Image naming (if using images): `quiz-generation-api`, `quiz-generation-rasterize`, `quiz-generation-llm`
- Log files mapped to `/var/log/quiz-tuition` per deployment guide
- All server-only secrets remain on EC2 (`.env`), never in Git

---

## Option A: GitHub Actions deploys via SSH (simple, no registry)

### What this does

- On push to `main` (optionally only if `apps/api/**` changed)
- The workflow SSH-es into EC2 and executes your deploy script (`apps/api/deploy.sh`):
  - Pull latest code from GitHub (your script already does this)
  - Stop old containers (your script already does this)
  - Remove old images (your script already does this)
  - Build fresh images (your script already does this)
  - Start containers (your script already does this)
  - **Optional**: Run Prisma migrations (can be added to your script or workflow)
  - **Optional**: Health check with rollback (can be added to your script or workflow)

### Setup (one-time)

1. Create a deploy user/key (or reuse your key)

- Generate SSH key (on your machine):
  - `ssh-keygen -t ed25519 -C "quiz-tuition-deploy"`
  - Copy public key to `~/.ssh/authorized_keys` for your EC2 user (e.g., `ec2-user`)
- Test SSH:
  - `ssh -i /path/to/key.pem ec2-user@YOUR_EC2_IP`

2. Ensure Git remotes are clean on EC2

- On EC2:
  - `cd ~/quiz-tuition`
  - `git remote -v` shows GitHub origin
  - Ensure the branch is `main`: `git checkout main`

3. Use your existing deploy script OR create a wrapper

- **Option 1 (Simplest)**: Use your existing `apps/api/deploy.sh` script directly
  - The script already pulls code, stops containers, builds images, and starts containers
  - Just make sure it's executable on EC2: `chmod +x ~/quiz-tuition/apps/api/deploy.sh`
  - GitHub Actions will SSH in and run it
- **Option 2 (Enhanced)**: Create a wrapper script `~/deploy-backend.sh` that:
  - Calls your `apps/api/deploy.sh` script
  - Adds Prisma migrations (if not in deploy.sh)
  - Adds health checks and rollback logic
  - See "Enhanced Deploy Script" below for the wrapper

4. Add GitHub Secrets (Repository → Settings → Secrets and variables → Actions → New repository secret)

- `EC2_HOST`: your Elastic IP or DNS
- `EC2_USER`: `ec2-user` (or your user)
- `EC2_SSH_KEY`: the private key content (paste full key)
- Optional:
  - `EC2_PORT`: `22` (default)
  - `PROJECT_DIR`: `/home/ec2-user/quiz-tuition`
  - `COMPOSE_FILE`: `/home/ec2-user/quiz-tuition/apps/api/docker-compose.prod.yml`
  - `ENV_FILE`: `/home/ec2-user/quiz-tuition-deploy/.env`
  - `HEALTH_URL`: `http://localhost:4080/api/v1/health`
  - `ROLLBACK_MINUTES`: `60` (how far back to look for previous images)

### Server Deploy Script (save on EC2 at `~/deploy-backend.sh`)

#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/home/ec2-user/quiz-tuition}"
COMPOSE_FILE="${COMPOSE_FILE:-/home/ec2-user/quiz-tuition/apps/api/docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-/home/ec2-user/quiz-tuition-deploy/.env}"
HEALTH_URL="${HEALTH_URL:-http://localhost:4080/api/v1/health}"
ROLLBACK_MINUTES="${ROLLBACK_MINUTES:-60}"

cd "${PROJECT_DIR}"

echo "[1/7] Fetch latest code..."
git fetch --all --prune
git reset --hard origin/main

echo "[2/7] Capture current image digests (for rollback)..."
timestamp="$(date +%Y%m%d-%H%M%S)"
rollback_file="/tmp/rollback-images-${timestamp}.txt"
docker ps --format '{{.Image}}' | sort | uniq > "${rollback_file}" || true
echo "Saved rollback image list to ${rollback_file}"

echo "[3/7] Stop running stack..."
docker compose -f "${COMPOSE_FILE}" down || true

echo "[4/7] Build fresh images..."
docker compose -f "${COMPOSE_FILE}" build

echo "[5/7] Run Prisma migrations..."

# Run migrations in a temporary Node container with env mounted

docker run --rm \
 --env-file "${ENV_FILE}" \
  -v "${PROJECT_DIR}/apps/api:/app" \
 -w /app \
 node:20-alpine sh -c "
apk add --no-cache python3 make g++ &&
npm ci &&
npx prisma migrate deploy &&
npx prisma generate
"

echo "[6/7] Start stack..."
docker compose -f "${COMPOSE_FILE}" up -d

echo "[7/7] Health check..."
max_tries=12
sleep_between=5
for i in $(seq 1 ${max_tries}); do
  if curl -fsS "${HEALTH_URL}" > /dev/null; then
echo "Health check passed."
exit 0
fi
echo "Health check attempt ${i}/${max_tries} failed; retrying in ${sleep_between}s..."
sleep ${sleep_between}
done

echo "Health check failed. Rolling back..."

# Attempt rollback by stopping, pulling older images if tagged/present, and restarting

docker compose -f "${COMPOSE_FILE}" down || true

# Try to re-run previous compose build with cached layers (cheap rollback if code still present)

# If you maintain tags, replace with specific 'docker compose pull' of previous tags

# As a last resort, try to re-run previous images tracked in ${rollback_file}

if [ -s "${rollback_file}" ]; then
echo "Attempting to restore previous images from ${rollback_file} (best-effort)..."
  while read -r img; do
    echo "Pulling ${img} (if it exists)..."
    docker pull "${img}" || true
done < "${rollback_file}"
fi

echo "Starting stack after rollback attempt..."
docker compose -f "${COMPOSE_FILE}" up -d || true

echo "Rollback health verification..."
if curl -fsS "${HEALTH_URL}" > /dev/null; then
echo "Rollback successful."
exit 1
fi

echo "Rollback did not recover service. Manual intervention required."
exit 1

````

**Notes:**
- Keep this script small and self-contained. It's designed to be safe, fail-fast, and leave logs in Actions.
- **OR** you can enhance your existing `apps/api/deploy.sh` to include migrations and health checks (see below)

### GitHub Actions Workflow (add to `.github/workflows/deploy-backend.yml`)

**Option 1: Simple - Use your existing deploy.sh directly**

```yaml
name: Deploy Backend to EC2

on:
  push:
    branches: [ "main" ]
    # Uncomment to deploy only when backend changes
    # paths:
    #   - "apps/api/**"
    #   - ".github/workflows/deploy-backend.yml"

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: SSH Deploy to EC2
        uses: appleboy/ssh-action@v1.2.0
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          port: ${{ secrets.EC2_PORT || 22 }}
          script_stop: true
          script: |
            cd ~/quiz-tuition/apps/api
            chmod +x deploy.sh
            ./deploy.sh
````

**Option 2: Enhanced - With migrations and health checks**

```yaml
name: Deploy Backend to EC2

on:
  push:
    branches: ["main"]
    # Uncomment to deploy only when backend changes
    # paths:
    #   - "apps/api/**"
    #   - ".github/workflows/deploy-backend.yml"

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: SSH Deploy to EC2
        uses: appleboy/ssh-action@v1.2.0
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          port: ${{ secrets.EC2_PORT || 22 }}
          script_stop: true
          script: |
            export PROJECT_DIR="${{ secrets.PROJECT_DIR || '/home/ec2-user/quiz-tuition' }}"
            export COMPOSE_FILE="${{ secrets.COMPOSE_FILE || '/home/ec2-user/quiz-tuition/apps/api/docker-compose.prod.yml' }}"
            export ENV_FILE="${{ secrets.ENV_FILE || '/home/ec2-user/quiz-tuition-deploy/.env' }}"
            export HEALTH_URL="${{ secrets.HEALTH_URL || 'http://localhost:4080/api/v1/health' }}"

            # Run your existing deploy script
            cd ~/quiz-tuition/apps/api
            chmod +x deploy.sh
            ./deploy.sh

            # Run Prisma migrations (if not already in deploy.sh)
            echo "Running Prisma migrations..."
            docker run --rm \
              --env-file "$ENV_FILE" \
              -v ~/quiz-tuition/apps/api:/app \
              -w /app \
              node:20-alpine sh -c "
                apk add --no-cache python3 make g++ &&
                npm ci &&
                npx prisma migrate deploy &&
                npx prisma generate
              "

            # Health check
            echo "Checking API health..."
            max_tries=12
            sleep_between=5
            for i in $(seq 1 ${max_tries}); do
              if curl -fsS "$HEALTH_URL" > /dev/null; then
                echo "✓ Health check passed!"
                exit 0
              fi
              echo "Health check attempt ${i}/${max_tries} failed; retrying in ${sleep_between}s..."
              sleep ${sleep_between}
            done

            echo "✗ Health check failed after ${max_tries} attempts"
            exit 1
```

**Optional enhancements:**

- Slack/Discord notification on success/failure (add a step using a webhook action)
- Path filters to reduce unnecessary deployments
- Manual dispatch workflow to trigger ad-hoc deployments

### Enhancing Your Existing deploy.sh Script

If you want to add migrations and health checks to your existing `apps/api/deploy.sh` script, you can add these steps:

**After Step 6 (Starting containers), add:**

```bash
# Step 7: Run Prisma migrations
print_step "Step 7: Running Prisma migrations..."
ENV_FILE="${ENV_FILE:-/home/ec2-user/quiz-tuition-deploy/.env}"
if [ -f "$ENV_FILE" ]; then
    docker run --rm \
      --env-file "$ENV_FILE" \
      -v "$API_DIR:/app" \
      -w /app \
      node:20-alpine sh -c "
        apk add --no-cache python3 make g++ &&
        npm ci &&
        npx prisma migrate deploy &&
        npx prisma generate
      "
    print_success "Migrations completed"
else
    print_error "Environment file not found: $ENV_FILE"
    exit 1
fi

# Step 8: Health check
print_step "Step 8: Checking API health..."
HEALTH_URL="${HEALTH_URL:-http://localhost:4080/api/v1/health}"
max_tries=12
sleep_between=5

for i in $(seq 1 ${max_tries}); do
    if curl -fsS "$HEALTH_URL" > /dev/null 2>&1; then
        print_success "Health check passed!"
        exit 0
    fi
    echo -e "${YELLOW}Health check attempt ${i}/${max_tries} failed; retrying in ${sleep_between}s...${NC}"
    sleep ${sleep_between}
done

print_error "Health check failed after ${max_tries} attempts"
exit 1
```

Then update your GitHub Actions workflow to just call the script (Option 1 above).

---

## Option B: Build in CI, Push to Registry, Pull on EC2 (scalable)

When you prefer faster deploys and consistent images across environments:

- CI builds and pushes images to GHCR or Docker Hub tagged with `sha` and `latest`
- EC2 runs `docker compose pull && docker compose up -d --no-build`
- Add Watchtower on EC2 for fully automatic pull/restart on new tags

Setup:

- Create registry PAT and add GitHub Secrets:
  - `REGISTRY` (`ghcr.io` or `docker.io`)
  - `REGISTRY_USERNAME`
  - `REGISTRY_TOKEN`
- Update `docker-compose.prod.yml` to use `image:` for each service (not `build:`), e.g.:
  - `image: ghcr.io/YOUR_USER/quiz-generation-api:latest`
- CI Workflow:
  - Build multi-stage images for `api-server`, `rasterize-worker`, `llm-worker`
  - Tag with `:latest` and `:${{ github.sha }}`
  - Push to registry
  - SSH to EC2 (or self-hosted runner) and run:
    - `docker compose pull`
    - run migrations
    - `docker compose up -d`

This yields faster restarts and clean rollbacks using tags.

---

## Option C: Self-Hosted Runner on EC2 (no SSH keys, very reliable)

- Install GitHub Actions runner on EC2 and register with your repo
- Workflow uses `runs-on: [self-hosted, linux, x64]` and runs commands locally:
  - `cd ~/quiz-tuition && git fetch/reset ...`
  - `docker compose down && build && up -d`
  - run migrations and health checks
- Pros: no SSH secrets, very consistent. Cons: runner maintenance.

---

## Health Checks and Rollbacks

- Health URL: `http://localhost:4080/api/v1/health` (or `/healthz`)
- CI waits up to ~1 minute (configurable) for success
- If failure:
  - Stop stack, attempt best-effort rollback (previous images/layers)
  - Start stack and re-check
  - Mark workflow failed for visibility
- For strong rollbacks, use registry tags per commit and keep n previous tags

---

## Zero-Downtime (Optional)

For near-zero downtime:

- Blue/Green: duplicate compose project with different external ports or labels
  - Bring up “green”, run migrations that are backward-compatible
  - Point Nginx upstream to “green” (or swap Compose project names)
  - Bring down “blue” after verification
- Rolling: If each service is stateless, restart one by one; ensure DB migrations are backward-compatible

---

## Frontend (Amplify) Integration

- Amplify already builds on push. Optionally:
  - Add a status check job that pings the API health endpoint before triggering Amplify “redeploy” (if you use Amplify webhooks)
  - Or simply rely on Amplify’s own pipeline

---

## Observability

- Log Actions runs for deploy audit
- On EC2:
  - `docker compose logs --tail 200 api-server`
  - Nginx logs: `/var/log/nginx/quiz-generation-*.log`
  - App logs: `/var/log/quiz-tuition`
- Optional: send deploy events to CloudWatch or Slack

---

## Security

- Restrict SSH to your IP
- Use GitHub Secrets for keys; rotate regularly
- On EC2, env file permissions: `chmod 600 ~/quiz-tuition-deploy/.env`
- Do not store secrets in repo
- Principle of least privilege for registry tokens

---

## Runbook: Common CI/CD Ops

- Force redeploy:
  - Commit to `apps/api/**` or manually re-run workflow with “Re-run jobs” in Actions
- Quick restart (server):
  - `docker compose -f ~/quiz-tuition/apps/api/docker-compose.prod.yml restart`
- View last deploy logs:
  - Open the latest “Deploy Backend to EC2” run in GitHub Actions
- Rollback to previous image (registry-based):
  - Update compose `image: ...:PREVIOUS_TAG`, then `docker compose up -d`

---

## FAQ

- Why not run Prisma migrate inside the API container?
  - You can. For stricter control, we run it explicitly in CI/SSH before starting services.
- Can we deploy only on backend changes?
  - Yes, use `paths:` filter in the workflow.
- How do we handle schema changes that break running code?
  - Use backward-compatible migrations or zero-downtime strategy.

---

## Quick Start Checklist

1. Create `~/deploy-backend.sh` on EC2 (from this guide), `chmod +x`
2. Add GitHub Secrets: `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY` (+ optional vars)
3. Add `.github/workflows/deploy-backend.yml` (Option A)
4. Push a change to `apps/api/**`
5. Watch GitHub Actions → verify it deploys and health check passes
6. Confirm API works through Nginx (HTTPS)

Deployment automation complete. 🚀
