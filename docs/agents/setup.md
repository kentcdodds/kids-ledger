# Setup

Quick notes for getting a local kids-ledger environment running.

## Prerequisites

- Bun (used for installs and scripts).
- A recent Node runtime for tooling that Bun delegates to.

## Install

- `bun install`

## Wrangler template vs deploy

The repo’s `wrangler.jsonc` lists bindings and `database_name` values but does
not check in remote D1/KV IDs (so clones do not inherit another project’s
resources). GitHub Actions deploys run `tools/ci/production-resources.ts` /
`tools/ci/preview-resources.ts` to create or resolve resources and emit
generated configs with real IDs. Local `bun run dev` does not require Cloudflare
resource setup.

## Local development

- Copy `.env.test` to `.env` before starting any work, then update secrets as
  needed.
- `bun run dev` (starts mock API servers automatically and sets
  `RESEND_API_BASE_URL` to the local mock Worker).
- Add new mock API servers by following `docs/agents/mock-api-servers.md`.
- Seed or refresh the local test login:
  - `bun run migrate:local`
  - `bun tools/seed-test-data.ts --local`
  - test login: `kody@kcd.dev` / `kodylovesyou`
- If you only need the client bundle or worker, use:
  - `bun run dev:client`
  - `bun run dev:worker`
- Set `CLOUDFLARE_ENV` to switch Wrangler environments (defaults to
  `production`). Playwright sets this to `test`.

## Checks

- `bun run validate` runs format check, lint, build, typecheck, Playwright
  tests, and MCP E2E tests.
- `bun run format` applies formatter updates.
- `bun run test:e2e:install` to install Playwright browsers.
- `bun run test:e2e` to run Playwright specs.
- `bun run test:mcp` to run MCP server E2E tests.

## Seed test account

Use this script to ensure a known login exists in any environment:

- Local D1 (default): `bun tools/seed-test-data.ts`
- Local D1 with custom persisted state:
  `bun tools/seed-test-data.ts --local --persist-to .wrangler/state/e2e`
- Remote D1:
  `CLOUDFLARE_ENV=preview bun tools/seed-test-data.ts --remote --config <wrangler-config-path>`
- Default credentials:
  - email: `kody@kcd.dev`
  - password: `kodylovesyou`
- Override credentials when needed:
  `bun tools/seed-test-data.ts --email <email> --password <password> --username <username>`
- When updating auth schema or user model columns, update
  `tools/seed-test-data.ts` so this script remains valid for local and preview
  verification.

### Reset, re-migrate, then seed

For a full local reset before seeding:

1. Drop app tables:
   - `bun ./wrangler-env.ts d1 execute APP_DB --local --env production --command "PRAGMA foreign_keys=OFF; DROP TABLE IF EXISTS transactions; DROP TABLE IF EXISTS accounts; DROP TABLE IF EXISTS kids; DROP TABLE IF EXISTS households; DROP TABLE IF EXISTS quick_amount_presets; DROP TABLE IF EXISTS password_resets; DROP TABLE IF EXISTS mock_resend_messages; DROP TABLE IF EXISTS users; PRAGMA foreign_keys=ON;"`
2. Re-apply migrations:
   - `bun run migrate:local`
3. Seed test account:
   - `bun tools/seed-test-data.ts --local`

## Ledger-specific smoke checks

After `bun run dev` is running and you are logged in:

- `/` should render the main ledger board with family total and account cards.
- `/` transaction modals should offer a `Current Total ($X.XX)` quick amount
  button that mirrors the selected account balance and fills the amount field
  with that value.
- `/settings` should allow creating kids/accounts and managing archive/delete.
- `/settings` kid cards should allow saving per-kid transaction modal CSS
  declarations/rules (including optional `@import` font rules), show a live
  in-modal preview while editing, show the kid's emoji as the drifting page
  background while either the custom CSS editor or transaction modal is open,
  and `/` should apply saved CSS to the page only while that kid's transaction
  modal is open.
- `/history` should show recent-first transactions and URL-synced filters.
- `/ledger/export/json` should download a JSON backup while authenticated.

## PR preview deployments

The GitHub Actions preview workflow creates per-preview Cloudflare resources so
each PR preview is isolated:

- D1 database: `<preview-worker-name>-db`
- KV namespace (OAuth state): `<preview-worker-name>-oauth-kv`

After preview migrations complete, the workflow seeds the preview D1 database
with a shared test login account:

- username/email: `kody@kcd.dev`
- password: `kodylovesyou`

When a PR is closed, the cleanup job deletes the preview Worker(s) and these
resources as well.

Cloudflare Workers supports version `preview_urls`, but those preview URLs are
not currently available for Workers that use Durable Objects. The main app
Worker binds `MCP_OBJECT`, so app previews continue to use per-PR Worker names.
Mock Workers do not use Durable Objects, so their Wrangler configs opt into
`preview_urls = true` and the workflow includes mock version preview links when
Cloudflare returns them.

Production deploys also ensure required Cloudflare resources exist before
migrations/deploy:

- D1 database: from `env.production.d1_databases` binding `APP_DB`
- KV namespace: `OAUTH_KV` (defaults to `<worker-name>-oauth` when creating)

Both the preview and production deploy workflows run a post-deploy healthcheck
against `<deploy-url>/health` and fail the job if it does not return
`{ ok: true, commitSha }` with `commitSha` matching the commit SHA deployed by
that workflow.

If you ever need to do the same operations manually, use:

- `bun tools/ci/preview-resources.ts ensure --worker-name <name> --out-config <path>`
- `CLOUDFLARE_ENV=preview bun tools/seed-test-data.ts --remote --config <path>`
- `bun tools/ci/preview-resources.ts cleanup --worker-name <name>`
- `bun tools/ci/production-resources.ts ensure --out-config <path>`

## Remix package docs

Use the Remix package index for quick navigation:

- `docs/agents/remix/index.md`
