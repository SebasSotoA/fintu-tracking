# Deployment (GitHub Actions to AWS)

This guide covers repository secrets, AWS OIDC, workflow triggers, and Supabase Auth redirect URLs for **sandbox** and **production**.

## Overview

| Environment | Trigger | Workflow | AWS OIDC secret | Web | API |
|-------------|---------|----------|-----------------|-----|-----|
| Sandbox | Push to `main`, or manual **workflow_dispatch** | `.github/workflows/on-push.yml` | `AWS_ROLE_ARN` | `https://app.sandbox.fintu.com` | `https://api.sandbox.fintu.com` |
| Production | Push tag matching `v*` (excluding `v*rc*`) | `.github/workflows/on-tags.yml` | `AWS_ROLE_ARN_PROD` | `https://app.fintu.com` | `https://api.fintu.com` |

Both environments call the reusable workflow `.github/workflows/infra.yml`, which deploys the Go Lambda, runs `database-status` and `user-migration` invokes, configures API Gateway, builds the static Next.js export, and publishes `frontend/out` to S3/CloudFront.

**Note:** `DATABASE_URL` is a single repo secret today; sandbox and production AWS stacks share the same Postgres unless you split secrets later (see Phase 4.3).

---

## GitHub repository secrets (9)

Configure these under **Settings > Secrets and variables > Actions** for the repository.

| Secret | Purpose |
|--------|---------|
| `AWS_ROLE_ARN` | IAM role ARN for GitHub OIDC - used by sandbox deploy (`on-push.yml`). |
| `AWS_ROLE_ARN_PROD` | IAM role ARN for GitHub OIDC - used by production deploy (`on-tags.yml`). |
| `DATABASE_URL` | Supabase Postgres connection string for the Lambda (`postgresql://...`). Prefer the **transaction pooler** URL for Lambda (see `infra.yml`); shared by sandbox and prod unless you add a separate prod secret later. |
| `SUPABASE_URL` | Supabase project URL (e.g. `https://[project-ref].supabase.co`) - Lambda JWKS / auth validation. |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret - Lambda HS256 fallback when validating tokens. |
| `TWELVE_DATA_API_KEY` | Twelve Data API key for market price data in the backend. |
| `NEXT_PUBLIC_SUPABASE_URL` | Baked into the frontend static build - must match the Supabase project users sign in against. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key - baked into the frontend static build. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Optional. Google Cloud OAuth 2.0 **Web** client ID baked into the frontend for Google Identity Services. If unset, Login with Google is hidden and email/password still works. |

**Not stored as secrets (set in workflow):**

- `NEXT_PUBLIC_API_URL` -> `https://{api_domain}` per environment
- `FRONTEND_URL` -> `https://{web_domain}` on Lambda
- `ENVIRONMENT` -> `sandbox` or `prod`
- `DB_MAX_OPEN_CONNS` -> `5`, `DB_MAX_IDLE_CONNS` -> `2`

---

## AWS OIDC setup checklist

Complete these in AWS **before** the first green deploy run.

- [ ] **GitHub OIDC identity provider** exists in IAM (`token.actions.githubusercontent.com`), if not already configured for the account.
- [ ] **IAM role(s)** for deploy with trust policy allowing `sts:AssumeRoleWithWebIdentity` from that provider.
- [ ] Trust policy **subject** matches your repo, e.g. `repo:SebasSotoA/fintu-tracking:ref:refs/heads/main` for sandbox and/or `repo:SebasSotoA/fintu-tracking:ref:refs/tags/v*` for production (adjust org/repo as needed).
- [ ] Role has permissions required by realsensesolutions deploy actions: Lambda, API Gateway, S3, CloudFront, IAM pass-role, etc. (mirror your llm-control-plane or existing fintu sandbox role).
- [ ] **`AWS_ROLE_ARN`** secret set to the sandbox role ARN.
- [ ] **`AWS_ROLE_ARN_PROD`** secret set to the production role ARN (can be the same role with broader trust, or a separate role - recommended separate for prod).
- [ ] Workflows use `permissions: id-token: write` and `contents: read` (already defined on caller workflows).
- [ ] **DNS (Phase 4.5):** `app.sandbox.fintu.com`, `api.sandbox.fintu.com`, `app.fintu.com`, `api.fintu.com` point to the deployed CloudFront/API Gateway endpoints after first deploy.

---

## Sandbox vs production triggers

### Sandbox

- **Automatic:** every push to the `main` branch runs `on-push.yml`.
- **Manual:** Actions -> **Deploy Sandbox Environment** (`on-push.yml`) -> **Run workflow**.
- **Deploy inputs:** `instance_name=fintu-sandbox`, `web_domain=app.sandbox.fintu.com`, `api_domain=api.sandbox.fintu.com`, `environment=sandbox`.

### Production

- **Automatic:** pushing a git tag `v*` (e.g. `v1.0.0`) runs `on-tags.yml`. Tags matching `v*rc*` (release candidates) are **excluded**.
- **Manual:** production is tag-driven; create and push a version tag rather than reusing the sandbox workflow.
- **Deploy inputs:** `instance_name=fintu-production`, `web_domain=app.fintu.com`, `api_domain=api.fintu.com`, `environment=prod`.

Local CI (`.github/workflows/ci.yml`) still runs on PRs; it does not deploy.

---

## Supabase Auth redirect URLs

In the [Supabase Dashboard](https://supabase.com/dashboard) -> **Authentication** -> **URL configuration**, set **Site URL** and **Redirect URLs** so OAuth/magic-link callbacks work for each deployed host.

### Sandbox (`app.sandbox.fintu.com`)

- **Site URL (optional for multi-env):** `https://app.sandbox.fintu.com`
- **Redirect URLs (add all that apply):**
  - `https://app.sandbox.fintu.com/**`
  - `https://app.sandbox.fintu.com/auth/callback`
  - `http://localhost:3000/**` (local dev)

### Production (`app.fintu.com`)

- **Site URL:** `https://app.fintu.com` (or primary prod URL)
- **Redirect URLs:**
  - `https://app.fintu.com/**`
  - `https://app.fintu.com/auth/callback`

If sandbox and production share one Supabase project, **include every redirect URL from both environments** in the same allow list. For stricter isolation, use separate Supabase projects (Phase 4.3) and matching `NEXT_PUBLIC_*` / `SUPABASE_*` secrets per environment.

`/auth/callback` is used for **magic-link / code exchange** (password reset, email confirmation). Google Sign-In does **not** use this route.

---

## Google Identity Services (Login with Google)

Google Sign-In runs **on the app origin** via Google Identity Services (GIS). The browser receives a Google ID token and the app calls Supabase `signInWithIdToken`. Google never redirects through `*.supabase.co`.

Do **not** add `https://<project>.supabase.co/auth/v1/callback` (or any `*.supabase.co` callback) as an Authorized redirect URI for this GIS flow.

### Google Cloud (OAuth 2.0 Web client)

Authorized JavaScript origins:

- `http://localhost:3000`
- `https://app.sandbox.fintu.com`
- `https://app.fintu.com`

In [Supabase Dashboard](https://supabase.com/dashboard) -> **Authentication** -> **Providers** -> **Google**, enable Google and set the same Web client ID (and client secret) so Supabase can verify the ID token. That is not a browser redirect to supabase.co.

Set GitHub secret `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to that Web client ID so `infra.yml` can bake it into the static export.

---

## Local development

- Frontend: copy [`.env.local.example`](../frontend/.env.local.example) to `frontend/.env.local`.
- Backend: copy [`.env.example`](../backend/.env.example) to `backend/.env` and fill values.

Run the stack from the repo root: `make dev`.
