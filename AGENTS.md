# kids-ledger

We use bun for installing dependencies and running scripts. Do not use npm.

## Code style

- Read and follow `docs/agents/code-style.md` before writing code.
- Match the surrounding file style (quotes, semicolons, formatting).

## Agent setup

- Install dependencies with `bun install`.
- Apply local D1 migrations with `bun run migrate:local` before DB-backed tests.
- Copy `.env.test` to `.env` before running dev or tests.

## Verification before commit

- Run the Full Gate: `bun run validate`.
- Run formatting: `bun run format`.

## Documentation maintenance

- After completing code changes, update `docs/agents` when behavior, workflows,
  architecture notes, or verification guidance have changed.
- Treat documentation updates as part of done work so `docs/agents` stays
  current.
- Keep `AGENTS.md` concise and map-like; put detailed guidance in focused docs.
- When failures repeat, promote lessons from docs into tests, lint rules, or
  scripts so improvements compound.

## References

- [Setup](./docs/agents/setup.md)
- [Code Style](./docs/agents/code-style.md)
- [Cloudflare Agents SDK](./docs/agents/cloudflare-agents-sdk.md)
- [MCP Apps Starter Guide](./docs/agents/mcp-apps-starter-guide.md)
- [Harness Engineering](./docs/agents/harness-engineering.md)
- [Remix Packages](./docs/agents/remix/index.md)
- [Testing Principles](./docs/agents/testing-principles.md)
- [End-to-End Testing](./docs/agents/end-to-end-testing.md)
- [Oxlint JS Plugins](./docs/agents/oxlint-js-plugins.md)
- [Getting Started](./docs/getting-started.md)
- [Environment Variables](./docs/environment-variables.md)
- [Setup Manifest](./docs/setup-manifest.md)

## Architecture references

- [Architecture Overview](./docs/architecture/index.md)
- [Request Lifecycle](./docs/architecture/request-lifecycle.md)
- [Authentication](./docs/architecture/authentication.md)
- [Data Storage](./docs/architecture/data-storage.md)

## Cursor Cloud specific instructions

- Dev server runs on port **3742** by default (`bun run dev`). The mock Resend
  API server starts on port **8788**.
- E2E tests (`bun run test:e2e`) also use port 8788 for the Playwright web
  server. **Stop `bun run dev` before running E2E tests** to avoid port
  conflicts that cause all tests to fail.
- No Docker or external services are needed. D1, KV, and Durable Objects are
  all emulated locally by Wrangler.
- See `.cursor/CLOUD.md` for quick-reference command table and architecture
  notes.
