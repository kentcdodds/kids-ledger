# Remix documentation

The installed `remix@3.0.0` package ships its own version-matched docs:

- Task and export index: `node_modules/remix/INDEX.md`
- Workflow guides in `node_modules/remix/guides/`: `01-start-here`,
  `02-routing-and-controllers`, `03-request-handling`, `04-rendering-ui`,
  `05-interactivity`, `06-streaming-ui-with-frames`, `07-animation`,
  `08-data-and-validation`, `09-forms-and-mutations`,
  `10-auth-sessions-security`, `11-files-and-assets`,
  `12-errors-and-cancellation`, `13-testing`, `14-cli-and-tooling`, and
  `15-production`
- Per-package API READMEs: `node_modules/remix/src/<package>/README.md`
- Official Remix app skill:
  [SKILL.md](https://github.com/remix-run/remix/blob/remix@3.0.0/.agents/skills/remix/SKILL.md)

The installed package has no `CHANGELOG.md`. Read the
[Remix 3.0.0 package changelog](https://github.com/remix-run/remix/blob/remix@3.0.0/packages/remix/CHANGELOG.md)
for umbrella release notes and the corresponding `packages/<pkg>/CHANGELOG.md`
for package-specific changes.

## kids-ledger adoption snapshot

- `remix/component`: `run`, `clientEntry`, built-in frame navigation, and
  `data-rmx-preserve-attrs` on the SSR `<body>` keep the app runtime integrated
  while preserving client-owned body attributes across frame reloads.
- `remix/router` and `remix/routes` define server routing.
- `remix/data-schema` validates application inputs.
- `remix/data-table` uses a custom D1 `DatabaseDriver` in
  `worker/d1-data-table-adapter.ts`, reusing `remix/data-table/sql-helpers`.
- `remix/cookie` supports the manual signed session cookie in
  `server/auth-session.ts`; the app does not use session middleware.
- A native styled checkbox on login preserves the remember-me form semantics.

Not used: `remix/assets` (esbuild and Wrangler Assets are used), `node-hmr`,
`node-fetch-server`, session/CSRF/CORS/COP middleware, `fetch-proxy`,
`tar-parser`, or `remix db`.

See the [Remix adoption audit](./adoption-audit.md) for compatibility findings,
recommendations, and upgrade notes.

When upgrading Remix, pin an exact version, read its changelog sections, audit
the changes against the table in `adoption-audit.md`, and update that audit.
