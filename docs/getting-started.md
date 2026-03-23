# kids-ledger Template Setup

<!--
If you're an agent reading this, do as much as you can yourself and then
tell the user what else they need to do themselves.
-->

Use these steps to generate a new project from this template and run it on
Cloudflare Workers.

## Create the project with degit

```
bunx degit epicweb-dev/epicflare my-kids-ledger-app
cd my-kids-ledger-app
```

## Install dependencies

We use bun for scripts and installs.

```
bun install
```

## Expectations and assumptions

The setup flow assumes:

- Bun is installed (uses `bun`/`bunx`).
- You run commands from the repo root (needs `wrangler.jsonc` and
  `package.json`).
- You can edit files in the repository (for example renaming the app and
  replacing template `kids-ledger` tokens across the project if you are
  forking/customizing).
- Wrangler is optional until you deploy or run remote Cloudflare commands. Local
  startup does **not** require Cloudflare resource setup in the dashboard.

The checked-in `wrangler.jsonc` does not bake in remote D1/KV IDs. CI deploys
create or resolve production/preview resources and write real IDs into generated
Wrangler configs at deploy time.

See `docs/setup-manifest.md` for required resources and secrets.

For optional Cloudflare offerings (R2, Workers AI, AI Gateway, extra KV), see
`docs/cloudflare-offerings.md`.

## Preflight checks

Optional: confirm Wrangler is available and authenticated (needed for deploy,
not for local dev):

```
bunx wrangler --version
bunx wrangler whoami
```

## Quick Start (local only)

1. Copy `.env.test` to `.env` and set secrets as needed (see
   `docs/setup-manifest.md`).
2. Start local development:

```
bun run dev
```

## Full Cloudflare setup (deploy)

1. Ensure `wrangler.jsonc` does not contain copied remote D1/KV IDs from another
   project (see `docs/setup-manifest.md`). The production deploy workflow
   creates missing D1/KV resources automatically on first CI deploy. Cloudflare
   deploys do not auto-create those resources from bindings alone, so the
   workflow runs an explicit ensure step before migrations/deploy.

2. Configure GitHub Actions secrets for deploy:

- `CLOUDFLARE_API_TOKEN` (Workers deploy + D1 edit access on the correct
  account)
- `COOKIE_SECRET` (generate with `openssl rand -hex 32` or similar)
- See `docs/setup-manifest.md` (`GitHub Actions secrets`) for full optional
  secrets and where to get each value.

3. Deploy:

```
bun run deploy
```

## Local development

See `docs/agents/setup.md` for local dev commands and verification steps.

To create a deterministic local test login, run:

```bash
bun run migrate:local
bun tools/seed-test-data.ts --local
```

Default test credentials:

- Email/username: `kody@kcd.dev`
- Password: `kodylovesyou`

## Build and deploy

Build the project:

```
bun run build
```

Deploy to Cloudflare:

```
bun run deploy
```
