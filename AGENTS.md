# Agents

This is important information for you to know about how this codebase is
structured.

## Stack

We're using:

- Cloudflare Workers configured in `wrangler.jsonc`
- React Router v7 with routes configured in `app/routes.ts`
- Tailwind CSS (v4) with custom theme configured in `app/app.css`
- Zod for schema validation
- Cloudflare D1 SQLite database with schema/migrations configured in
  `worker/db/migrations.ts`

## Misc

- Before committing, format the code using `npm run format`.
- If routes need to be changed, make sure to add any new routes to
  `app/routes.ts` and run `npm run typecheck` to ensure that the generated types
  are updated before anything else.

## App description and use cases

This is an app that keeps track of a user's kids' expenses. There's no login,
instead the ledger ID is generated when the user creates a new ledger and this
is passed in the URL as a path parameter.

Each ledger has a list of kids which each have an emoji avatar, a name, and a
list of accounts. Each account has a balance.

This is a very simple app. We do not need to keep track of transactions. We
simply keep a running balance for each account. Anyone should be able to
add/remove/edit data.

Backups and data recovery is important. Backup the database regularly and make
it easy to restore from backups.
