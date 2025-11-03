# Deployment Guide (Backend on EC2 + Frontend on Vercel)

This document supplements `deployment.md` with a Vercel-based frontend. Backend (API, workers, database, storage) remains the same as in the original guide. Only the frontend hosting differs.

---

## Frontend on Vercel (Next.js App Router)

### 1) Prepare repository

- Monorepo paths:
  - Frontend: `apps/web2` (Next.js 15) or `apps/web` (if you keep the original)
  - API remains under `apps/api` and is deployed on EC2 as before
- Ensure the frontend builds locally:
  ```bash
  cd apps/web2
  npm run build
  ```

### 2) Create Vercel project

- Go to Vercel Dashboard → New Project → Import Git Repository
- Select your repo
- In "Root Directory", set the app path:
  - `apps/web2` (recommended)
  - or `apps/web`
- Framework Preset: auto-detects Next.js

### 3) Build configuration

Vercel auto-detects Next.js (no custom build command needed). Verify:

- Build Command: `npm run build`
- Install Command: `npm install`
- Output Directory: `.next`
- Node version: Vercel default (Node 18/20 is fine for Next 15)

If you use Tailwind v4 and see Lightning CSS issues in custom builders (rare on Vercel):

- Add Environment Variable (optional): `TAILWIND_DISABLE_LIGHTNINGCSS = true`

### 4) Environment variables

Add the following in Vercel → Project → Settings → Environment Variables:

- `NEXT_PUBLIC_API_URL` = your API base URL (e.g., `https://quiz-generation.shafayet.me`)
- Any other `NEXT_PUBLIC_*` variables your app consumes

For previews, you may set environment variables per Environment (Development/Preview/Production).

### 5) Image config (optional)

If your app loads remote images (e.g., R2 public URLs), configure Next.js images in `next.config`:

```js
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "your-r2-domain.com" }],
  },
};
export default nextConfig;
```

### 6) Domains

- Use the default `*.vercel.app` URL immediately after first deploy
- To add a custom domain: Vercel Project → Settings → Domains → Add Domain
  - Update DNS (CNAME) at your registrar to point to Vercel

### 7) Preview deployments

- Every PR/branch gets a unique Preview URL
- Helpful for testing before merging to `main`

### 8) Production deployment

- Merge to the Production branch (e.g., `main`) to trigger a production deployment
- Vercel supports automatic rollbacks; keep an eye on the production checks

### 9) CORS & API

- Since the API is on a separate host (`quiz-generation.shafayet.me`), ensure API CORS allows the Vercel domain(s) and your custom domain if configured
- In production, prefer cookie-based auth with proper `sameSite` and `secure` flags if applicable

### 10) Observability

- Vercel Analytics/Logs can be enabled from the Project settings
- For client-side errors, consider Sentry or similar; add DSN via env vars

---

## Switching from Amplify to Vercel (Frontend only)

1. Keep backend running on EC2 per `deployment.md`
2. Point `NEXT_PUBLIC_API_URL` in Vercel to your API
3. Update DNS for the frontend (either use Vercel domain or add your custom domain)
4. Remove or pause Amplify frontend to avoid confusion (optional)

---

## Quick Troubleshooting

- Build fails on fonts (Geist): use `import { Geist, Geist_Mono } from 'geist/font'`
- PostCSS/Tailwind errors: ensure `postcss`, `autoprefixer`, `@tailwindcss/postcss` are installed and `postcss.config.(cjs|mjs)` includes them
- Lightning CSS binary issues: set `TAILWIND_DISABLE_LIGHTNINGCSS=true` (rare on Vercel)
- API 401/CORS: verify `NEXT_PUBLIC_API_URL` and backend CORS configuration

---

## Rollback

- Vercel → Deployments → Promote an earlier successful deployment back to Production with one click

---

This `deployment2.md` augments the original guide with a Vercel front‑end path. Use this when Amplify hosting is not required or you prefer Vercel’s Next.js‑native workflow.

---

## Phase 6: Frontend (Vercel) & DNS – Replaces Tasks 50+ from deployment.md

### Task 50: Note Vercel App URL

1. After the first deploy completes, Vercel shows a Production URL like:
   - `https://your-project.vercel.app`
2. Click to verify the site loads.

### Task 51: Add Custom Domain in Vercel (Optional)

1. Vercel → Project → Settings → Domains → Add Domain
2. Enter your desired frontend domain (e.g., `app.yourdomain.com`).
3. Vercel will display DNS records to add (usually a CNAME).

### Task 52: Configure DNS at your Registrar

1. In your DNS provider (e.g., Hostinger/Cloudflare/Route 53):
   - Create a CNAME for the frontend:
     - Name/Host: `app` (or your subdomain)
     - Value/Target: The Vercel-provided target (e.g., `cname.vercel-dns.com`)
     - TTL: 3600 (or default)
2. Save changes. Propagation typically takes 5–30 minutes.

### Task 53: Verify Domain & HTTPS

1. In Vercel Domains tab, wait for verification to turn green.
2. Vercel automatically provisions SSL certificates (Let’s Encrypt). No extra action needed.
3. Open `https://app.yourdomain.com` and confirm it resolves.

### Task 54: Configure Environment Variables on Vercel

1. Vercel → Project → Settings → Environment Variables
2. Add:
   - `NEXT_PUBLIC_API_URL` = `https://quiz-generation.shafayet.me` (or your API domain)
3. (Optional)
   - `TAILWIND_DISABLE_LIGHTNINGCSS` = `true` if you ever face CI issues with Tailwind v4.
4. Redeploy for new variables to take effect.

### Task 55: Test Frontend → API Integration

1. From your browser open the Production URL (`*.vercel.app` or custom domain).
2. Log in and exercise core flows (taxonomy, uploads, questions, etc.).
3. Open DevTools → Network; verify API calls go to `NEXT_PUBLIC_API_URL` and return 2xx.
4. If you see CORS errors, update backend CORS to allow your Vercel/custom domain.

### Task 56: Optional – Redirect Old Frontend URL

1. If you previously used Amplify or another host, set redirects at your DNS or old host to the new Vercel domain.

### Task 57: Monitoring & Rollback (Vercel)

1. Use Vercel Analytics and Logs for runtime visibility.
2. Rollback: Vercel → Deployments → Promote a previous successful deployment to Production.

### Task 58: Backend CORS for Vercel Domains

1. In the API server CORS config, add the Vercel Production domain and your custom domain (if any) to allowed origins.
2. For preview deployments, either:
   - Temporarily allow `*.vercel.app`, or
   - Add preview domains case‑by‑case (more secure).

### Task 59: Optional – Response Headers & Caching

1. In Vercel → Project → Settings → Headers, add security headers (e.g., `Content-Security-Policy`, `X-Frame-Options`).
2. Configure ISR/caching via route config or `next.config` as needed.

### Task 60: Environments & Branch Protection

1. Use Vercel Environments (Development/Preview/Production) to separate variables.
2. Protect Production by requiring PR approvals before merge.

### Task 61: Error & Performance Tracking (Optional)

1. Add Sentry (or similar) and set DSN via env vars.
2. Monitor Core Web Vitals with Vercel Analytics or a 3rd‑party tool.

### Task 62: Health Checks & Uptime

1. Point your uptime monitor at API `GET /healthz` and the Vercel frontend root.
2. Configure alerts for 4xx/5xx spikes and latency.

### Task 63: Cost & Quotas Checklist

1. Review Vercel usage (bandwidth, edge/serverless invocations if used).
2. Review R2 egress and API bandwidth from the frontend.

### Task 64: Handoff Notes

1. Document:
   - Vercel project/org
   - Domains
   - Required env vars and where they are set
   - API base URL and CORS policy

### Task 65: Migration From Amplify (If Previously Used)

1. Disable or delete the old Amplify frontend app to avoid confusion/costs.
2. Ensure DNS for the old frontend points to Vercel or is removed.

### Task 66: End‑to‑End Smoke Test

1. From the Vercel Production URL, run through login → taxonomy → upload → question review.
2. Check browser Network tab for 2xx responses and no CORS errors.
3. Verify images/R2 links render (update `next.config` images.remotePatterns if needed).

### Task 67: CI Hygiene

1. Protect `main` branch in GitHub; require PR review before merge.
2. Keep Vercel Preview deployments enabled for each PR; test there before merging.

### Task 68: Backup & Restore Pointers (unchanged)

1. RDS automated backups are still configured per `deployment.md`.
2. R2 object versioning (if enabled) continues to work regardless of frontend host.

### Task 69: Incident Runbook Links

1. Keep the original runbooks in `deployment.md` for backend/DB incidents.
2. Add a frontend runbook note: rollback via Vercel → Deployments → promote previous build.

### Task 70: Cost Review

1. Review Vercel plan usage (bandwidth/builds) monthly.
2. Review AWS (RDS/EC2/R2) costs as before.

### Task 71: Security Checklist

1. Ensure API CORS origins limited to Production and required Preview domains.
2. Add CSP headers in Vercel settings (optional but recommended).

### Task 72: Logging/Analytics (optional)

1. Enable Vercel Analytics for Web Vitals and traffic.
2. If using Sentry: set DSN in env vars and confirm error capture.

### Task 73: Health/Uptime

1. Monitor `GET /healthz` (API) and frontend root with an external uptime service.

### Task 74: Handoff Summary

1. Document: Vercel project/org, domains, env vars, API base URL, CORS policy, rollback steps.

### Task 75: Quarterly Review

1. Validate backups (RDS snapshot restore test) and verify Vercel rollback still works.
2. Update dependencies (Next.js, React, Tailwind) and rebuild.

### Task 76: Optional – CloudWatch Agent on EC2

1. Backend logging/metrics remain per `deployment.md` (CloudWatch agent optional).
2. If not already: install the agent, collect API/worker logs, and set 7–14 day retention.

### Task 77: Optional – CloudWatch Alarms

1. High CPU, low disk, and container down alarms for EC2/Redis as in `deployment.md`.
2. Optionally add an HTTPS probe to the API `/healthz` from a scheduled Lambda or third‑party.

### Task 78: Database Backups – Verify Retention

1. Confirm RDS automated backups window/retention (e.g., 7 days) is in place.
2. Run a manual snapshot monthly before planned upgrades.

### Task 79: SSL/TLS – API

1. Certbot auto‑renewal remains in place for the API domain.
2. Test renewal dry‑run quarterly: `sudo certbot renew --dry-run`.

### Task 80: Frontend Cache/Headers (Optional)

1. Add security headers and cache policies in Vercel headers if needed.
2. Tune image/domain configuration in Next.js for performance.

### Task 81: Document Environment Variables

1. Backend: copy list from `deployment.md` (DB URLs, JWT, R2, GenAI, etc.).
2. Frontend (Vercel): `NEXT_PUBLIC_API_URL` and any UI feature toggles.

### Task 82: SSH Access Notes (Backend)

1. Keep the existing SSH access/hardening steps from `deployment.md` for EC2.
2. No SSH needed for Vercel—use Vercel UI/CLI for deployments.

### Task 83: Operations Runbook

1. Backend operations remain the same (queues, migrations, workers).
2. Frontend operations: redeploy via Vercel, rollback via Deployments, update env vars in Vercel.

### Task 84: Backup/Restore Quick Reference

1. RDS restore from snapshot per `deployment.md`.
2. R2 objects: use versioning or restore flow if enabled.
3. Frontend: rollback by promoting a previous Vercel deployment.

### Task 85: Monitoring Checklist

1. Daily: API health, workers processing, no critical errors.
2. Weekly: Disk/CPU/memory health, queue depth, DB connections.
3. Monthly: Costs review (AWS + Vercel), dependency updates, security patches.
