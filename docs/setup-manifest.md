# Setup manifest

This document describes the infrastructure and secrets that kids-ledger expects.

## Cloudflare resources

This project uses the following resources:

- D1 database
  - `database_name`: `<app-name>` (from `wrangler.jsonc` `env.production`)
- KV namespace for OAuth/session storage
  - `binding`: `OAUTH_KV`
  - `title` at create time: `<worker-name>-oauth` (63-char limit; derived from
    the Worker `name` in `wrangler.jsonc` via
    `tools/ci/production-resources.ts`)

The checked-in `wrangler.jsonc` intentionally omits remote D1 (`database_id`,
`preview_database_id`) and KV (`id`, `preview_id`) values so a fresh clone
cannot accidentally deploy against another project’s Cloudflare account.

If you forked from a project that still had remote IDs in `wrangler.jsonc`,
remove `database_id`, `preview_database_id` on `APP_DB` and `id`, `preview_id`
on `OAUTH_KV` before deploying so you do not target another account’s resources.
Local dev (`bun run dev`) uses Wrangler’s local persistence and does **not**
require you to provision D1 or KV in the Cloudflare dashboard first.

Production and preview CI deploys **do** create or resolve the right D1/KV
resources and inject real IDs into a generated Wrangler config at deploy time
(`wrangler-production.generated.json` / `wrangler-preview.generated.json`).
Cloudflare deploys do not auto-create those resources from bindings alone, so
the deploy workflows run `bun tools/ci/production-resources.ts ensure` first.
Preview deploys use per-preview Worker names and isolated D1/KV resources.

### Migrating production data to a new D1/KV

If you pointed production at another project’s IDs and need to move real data
into databases owned by your account:

1. **Create** the target D1 database and KV namespace (CI `ensure` on first
   deploy, or run the same `production-resources` / `preview-resources` helpers
   manually with `CLOUDFLARE_API_TOKEN`).
2. **D1**: export from the old database (for example `wrangler d1 export`
   against the old binding) and import into the new database
   (`wrangler d1 execute`, or restore from a backup SQL dump). Re-run migrations
   on the new database if needed so the schema matches.
3. **KV (`OAUTH_KV`)**: mostly OAuth/session state; copying keys is possible but
   brittle. Plan for users to sign in again after cutover unless you
   deliberately migrate keys with a scripted copy.

## Optional Cloudflare offerings

The starter intentionally keeps the default footprint small. If you want to add
additional Cloudflare offerings (R2, Workers AI, AI Gateway, or a separate KV
namespace for app data), see:

- `docs/cloudflare-offerings.md`

## Rate limiting (Cloudflare dashboard)

Use Cloudflare's built-in rate limiting rules instead of custom Worker logic.

1. Open the Cloudflare dashboard for the zone that routes to your Worker.
2. Go to `Security` → `WAF` → `Rate limiting rules` (or `Rules` →
   `Rate limiting rules`).
3. Create a rule that targets auth endpoints, for example:
   - Expression:
     `(http.request.method eq "POST" and http.request.uri.path in {"/auth" "/oauth/authorize" "/oauth/token" "/oauth/register"})`
   - Threshold: `10` requests per `1 minute` per IP (tune as needed).
   - Action: `Block` or `Managed Challenge`.

## Environment variables

Local development uses `.env`, which Wrangler loads automatically:

- `COOKIE_SECRET` (generate with `openssl rand -hex 32`)
- `APP_BASE_URL` (optional; defaults to request origin, example
  `https://app.example.com`)
- `APP_COMMIT_SHA` (optional; set automatically by deploy workflows for
  version-aware `/health` checks)
- `RESEND_API_BASE_URL` (optional, defaults to `https://api.resend.com`)
- `RESEND_API_KEY` (optional, required to send via Resend)
- `RESEND_FROM_EMAIL` (optional, required to send via Resend)

Tests use `.env.test` when `CLOUDFLARE_ENV=test` (set by Playwright).

## GitHub Actions secrets

Configure these secrets for GitHub Actions workflows:

- `CLOUDFLARE_API_TOKEN` (Workers deploy + D1 edit access on the correct
  account)
- `COOKIE_SECRET` (same format as local)
- `APP_BASE_URL` (optional, used by the production deploy)
- `RESEND_API_KEY` (optional, required to send via Resend in non-mock
  environments)
- `RESEND_FROM_EMAIL` (optional, required to send via Resend)

How to get/set each secret:

- `CLOUDFLARE_API_TOKEN`
  - In Cloudflare Dashboard, create an API Token with permissions to deploy
    Workers and edit D1 on the target account.
  - In GitHub: `Settings` → `Secrets and variables` → `Actions` →
    `New repository secret`.
- `COOKIE_SECRET`
  - Generate locally: `openssl rand -hex 32`
  - Store the exact value as a repository secret in GitHub Actions.
- `APP_BASE_URL` (optional)
  - Use your production app URL (for example `https://app.example.com`).
  - Add only if you want deploy-time health/version checks to use a fixed URL.
- `RESEND_API_KEY` (optional)
  - Create in Resend Dashboard (API keys), then store in GitHub Actions secrets.
- `RESEND_FROM_EMAIL` (optional)
  - Use your verified sender/from address in Resend (for example
    `noreply@example.com`), then store it as a secret.

Preview deploys for pull requests create a separate Worker per PR named
`<app-name>-pr-<number>` (for kids-ledger: `kids-ledger-pr-123`) plus one Worker
per mock service named `<app-name>-pr-<number>-mock-<service>`. The same
`CLOUDFLARE_API_TOKEN` must be able to create/update and delete those Workers.

Preview deploys also seed the preview D1 database automatically via
`CLOUDFLARE_ENV=preview bun tools/seed-test-data.ts --remote --config <generated-config>`,
including a test account:

- `kody@kcd.dev` / `kodylovesyou`
