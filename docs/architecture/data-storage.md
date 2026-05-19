# Data storage

This project uses three Cloudflare storage systems for different purposes.

## D1 (`APP_DB`)

Relational app data lives in D1.

Current schema is defined by migrations in `migrations/`:

- `users`: login identity and password hash
- `password_resets`: hashed reset tokens with expiry and foreign key to users
- `households`: one household per authenticated parent user
- `kids`: child profiles scoped to a household (`sort_order`, archive flags)
- `accounts`: child account buckets (`account_type`, `color_token`,
  `sort_order`, archive flags)
- `transactions`: append-only money movements (signed `amount_cents`) with
  source fields for system-generated entries such as monthly interest
- `interest_accruals`: one monthly interest snapshot per account/period for
  idempotency and audit metadata
- `quick_amount_presets`: ordered household quick-amount values (in cents)

App access pattern:

- `worker/db.ts` defines shared `remix/data-table` table metadata and creates a
  D1-backed database runtime via `worker/d1-data-table-adapter.ts`
- Database row validation and API payload parsing use `remix/data-schema`
- app handlers and the mock Resend worker perform CRUD/query operations through
  `remix/data-table` (including `findOne`, `create`, `update`, `deleteMany`, and
  `count`)
- ledger business rules are centralized in `server/ledger/ledger-service.ts` and
  reused by HTTP handlers and MCP tools

### Database access preference

Use `remix/data-table` as the default access layer for D1 queries and writes.
This keeps table definitions centralized in `worker/db.ts`, preserves typed
CRUD/query helpers, and makes access patterns consistent across handlers, tests,
and MCP tools.

Exception: `server/ledger/ledger-service.ts` intentionally uses direct prepared
SQL (`D1Database.prepare`) for ledger workflows. The ledger domain depends on
custom joins, aggregates, and shape-specific read models that are easier to
express and tune with hand-written SQL while keeping all ledger persistence
logic centralized in one service.

## Monthly account interest

The Worker cron trigger runs at `0 0 1 * *` (UTC) and calls
`server/ledger/monthly-interest.ts`. Interest is configured centrally in
`shared/ledger-interest.ts`: Spending accounts earn 12% APY and Savings accounts
earn 24% APY. The monthly payout uses APY compounding:

```txt
monthlyInterest = balance * ((1 + APY) ** (1 / 12) - 1)
```

At the start of each month, the job snapshots each active account's current
ledger balance before interest, records an `interest_accruals` row for that
account and `YYYY-MM` period, and creates a normal `transactions` row with note
`Monthly interest` when the rounded interest amount is positive. The unique
accrual `(account_id, period)` makes reruns idempotent and also freezes zero
interest snapshots so a later rerun in the same month does not pay based on
post-snapshot deposits.

## KV (`OAUTH_KV`)

OAuth provider state is stored in KV through the
`@cloudflare/workers-oauth-provider` integration.

- Binding is configured in `wrangler.jsonc`
- This supports OAuth client and token flows without custom storage code in the
  app handlers

## Durable Objects (`MCP_OBJECT`)

MCP server runtime state is hosted via a Durable Object class (`MCP`) in
`mcp/index.ts`, exposed through the `/mcp` route.

- The Worker forwards authorized MCP requests to `MCP.serve(...).fetch`
- Durable Objects provide a stateful execution model for MCP operations

## Configuration reference

Bindings are configured per environment in `wrangler.jsonc`:

- `APP_DB` (D1)
- `OAUTH_KV` (KV)
- `MCP_OBJECT` (Durable Objects)
- `ASSETS` (static assets bucket)
