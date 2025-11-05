# CI/CD (Option 1) - GitHub Actions via SSH + Migrations + Health Check

This guide automates backend deployments to your AWS EC2 when you push to the GitHub main branch. It uses your existing script at apps/api/deploy.sh, then runs Prisma migrations, and finally performs a health check. The structure mirrors deployment.md with clear phases and tasks.

---

## Phase 1: Overview & Architecture

### Task 1: What This Pipeline Does

- Trigger: Push to main on GitHub
- Runner: GitHub-hosted Actions runner
- Connectivity: SSH from GitHub Actions to EC2 using an SSH private key stored in GitHub Secrets
- On EC2, the workflow will:
  - Run your existing deploy script: apps/api/deploy.sh (pulls code, stops containers, rebuilds, starts)
  - Run Prisma migrations against RDS
  - Generate Prisma client
  - Health check the API; fail the deployment if unhealthy

### Task 2: Components and File Paths

- Repository root: ~/quiz-tuition
- Deploy script (already present): ~/quiz-tuition/apps/api/deploy.sh
- Compose file: ~/quiz-tuition/apps/api/docker-compose.prod.yml
- Environment file: ~/quiz-tuition-deploy/.env
- Health endpoint: http://localhost:4080/api/v1/health (or /healthz)

---

## Phase 2: Prerequisites

### Task 3: Prepare EC2 Instance

1. Ensure Docker and Docker Compose are installed and running (see deployment.md tasks 16–17)
2. Ensure the repository is cloned on EC2 at ~/quiz-tuition and is on branch main
3. Ensure your deploy script is executable:
   - chmod +x ~/quiz-tuition/apps/api/deploy.sh
4. Confirm your .env is present and secured:
   - Path: ~/quiz-tuition-deploy/.env
   - Permissions: chmod 600 ~/quiz-tuition-deploy/.env

### Task 4: Open Security Group for SSH

1. EC2 Security Group must allow inbound SSH (22) from GitHub Actions runners or from your IP during setup
2. For better security, restrict SSH to your IP and use ephemeral access windows

### Task 5: Create/Verify SSH Key Pair for Actions

1. Generate key locally if needed:
   - ssh-keygen -t ed25519 -C "quiz-tuition-deploy"
2. Add the public key to EC2 user authorized_keys:
   - Append to ~/.ssh/authorized_keys for ec2-user
3. Test SSH from your machine:
   - ssh -i /path/to/private_key ec2-user@YOUR_EC2_IP

---

## Phase 3: GitHub Secrets & Workflow

### Task 6: Add GitHub Secrets

Repository → Settings → Secrets and variables → Actions → New repository secret:

- EC2_HOST: your EC2 Elastic IP or DNS
- EC2_USER: ec2-user (or your user)
- EC2_SSH_KEY: the full private key content (begin/end lines included)
- Optional:
  - EC2_PORT: 22
  - ENV_FILE: /home/ec2-user/quiz-tuition-deploy/.env
  - HEALTH_URL: http://localhost:4080/api/v1/health

### Task 7: Add GitHub Actions Workflow

Create .github/workflows/deploy-backend.yml in your repo with this content:

```yaml
name: Deploy Backend to EC2 (Option 1)

on:
  push:
    branches: ["main"]
    # Optional: limit to backend changes
    # paths:
    #   - "apps/api/**"
    #   - ".github/workflows/deploy-backend.yml"

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: SSH Deploy to EC2 (run deploy.sh)
        uses: appleboy/ssh-action@v1.2.0
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          port: ${{ secrets.EC2_PORT || 22 }}
          script_stop: true
          script: |
            set -euo pipefail
            cd ~/quiz-tuition/apps/api
            chmod +x deploy.sh
            ./deploy.sh

      - name: SSH Run Prisma migrations and health check
        uses: appleboy/ssh-action@v1.2.0
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          port: ${{ secrets.EC2_PORT || 22 }}
          script_stop: true
          script: |
            set -euo pipefail
            ENV_FILE="${{ secrets.ENV_FILE || '/home/ec2-user/quiz-tuition-deploy/.env' }}"
            HEALTH_URL="${{ secrets.HEALTH_URL || 'http://localhost:4080/api/v1/health' }}"

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

            echo "Health check..."
            max_tries=12
            sleep_between=5
            for i in $(seq 1 ${max_tries}); do
              if curl -fsS "$HEALTH_URL" > /dev/null; then
                echo "Health check passed."
                exit 0
              fi
              echo "Attempt ${i}/${max_tries} failed; retrying in ${sleep_between}s..."
              sleep ${sleep_between}
            done
            echo "Health check failed after ${max_tries} attempts"
            exit 1
```

Notes:
- The first SSH step runs your deploy.sh (build/start)
- The second SSH step runs migrations and performs the health check (clear separation in logs)

---

## Phase 4: First Run & Verification

### Task 8: Trigger the Pipeline

1. Commit/push a small change to apps/api/** on main
2. Open GitHub → Actions → Deploy Backend to EC2 (Option 1)
3. Watch both SSH steps complete

### Task 9: Verify on EC2

1. Check containers:
   - docker ps
   - docker compose -f ~/quiz-tuition/apps/api/docker-compose.prod.yml ps
2. Check logs:
   - docker compose -f ~/quiz-tuition/apps/api/docker-compose.prod.yml logs --tail 100 api-server
3. Health endpoint locally:
   - curl http://localhost:4080/api/v1/health
4. Through Nginx/HTTPS:
   - curl -I https://YOUR_DOMAIN/api/v1/health

---

## Phase 5: Hardening & Quality

### Task 10: Path Filters (Optional)

Restrict deploys to backend changes by uncommenting paths in the workflow.

### Task 11: Add Notifications (Optional)

Add a step for Slack/Discord notifications on success/failure using your webhook.

### Task 12: Rollback Strategy (Manual)

- If a deploy fails health check, the job fails, and your previous containers/images may still be running properly depending on your deploy.sh behavior
- To manually rollback quickly:
  - Re-run deploy.sh on a known-good commit (git reset --hard <good_sha> then rerun)
  - Or switch compose to a prior image tag if you adopt a registry/tag strategy later

---

## Phase 6: Troubleshooting

### Task 13: Common Issues

- SSH failure: Verify Secrets, SG rules, and that the public key is on EC2
- Docker not found: Ensure Docker/Compose installed and service active
- Prisma migrate fails: Check DATABASE_URL in .env, RDS SG allowing EC2
- Health check fails: Check api-server logs; verify PORT and HEALTH_URL

### Task 14: Useful Diagnostics

- On EC2:
  - docker ps
  - docker compose -f ~/quiz-tuition/apps/api/docker-compose.prod.yml logs --tail 200
  - sudo journalctl -u docker --no-pager --since "30 min ago"
  - curl -v http://localhost:4080/api/v1/health

---

## Phase 7: Maintenance

### Task 15: Keep Secrets & Keys Updated

- Rotate SSH keys periodically
- Ensure .env permissions remain 600

### Task 16: Review Costs and Performance

- Ensure the instance has enough CPU/RAM for builds
- Consider moving to Option B (prebuilt images) if builds are slow

---

## Quick Checklist

1. Ensure deploy.sh is executable and working on EC2
2. Add GitHub Secrets (EC2_HOST, EC2_USER, EC2_SSH_KEY)
3. Add the workflow file
4. Push to main and watch the run
5. Verify health and logs

Deployment automation via Option 1 is now live. 🚀


