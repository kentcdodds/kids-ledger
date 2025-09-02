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
