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
