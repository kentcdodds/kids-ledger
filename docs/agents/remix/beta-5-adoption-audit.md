# Remix 3 Beta 5 adoption audit

Audit date: 2026-07-09

## Status

This repository is already pinned to `remix@3.0.0-beta.5` in `package.json`. No
framework upgrade is a prerequisite for adopting Beta 5 features.

The application already uses the Beta 5 package entrypoints that matter to its
current architecture:

- `remix/ui` and `remix/ui/server` for the component runtime, hydration, and
  streamed server rendering.
- `remix/fetch-router` and `remix/fetch-router/routes` for server routing.
- `remix/data-schema`, `remix/data-table`, `remix/cookie`,
  `remix/html-template`, and `remix/response/html` for server concerns.

There are no imports from the removed `remix/components/*` entrypoints. Before
this audit, the app did not import any of the first-party controls added under
`remix/ui/*`.

Upstream references:

- [Remix 3.0.0-beta.5 release](https://github.com/remix-run/remix/releases/tag/remix%403.0.0-beta.5)
- [`remix/ui` overview](https://api.remix.run/api/remix/ui/overview/)
- [`remix/node-fetch-server` trusted proxy guidance](https://github.com/remix-run/remix/tree/main/packages/node-fetch-server#trusted-proxy-headers)

## Prioritized recommendations

### High: minify production browser assets

Status: adopted.

Paths:

- `package.json`
- `public/client-entry.js` and `public/mcp-apps/calculator-widget.js`
  (generated)

The improved `remix new` template distinguishes production startup and minifies
browser assets in production. This app does not use the template's Node asset
server, but the same production optimization applies to its esbuild and
Cloudflare Assets pipeline. The production-only `build:client:web` and
`build:mcp-apps` scripts now use esbuild's `--minify`; watch-mode development
scripts remain readable and fast.

Do not add the template's Node `start` command. Production here is a Wrangler
deployment of `worker/index.ts`, not a long-running Node process.

### High: start primitive adoption with the login checkbox

Status: adopted.

Path: `client/routes/login.tsx`

The "Remember me for 2 months" field is a native checkbox with simple form
semantics and existing end-to-end coverage. It is now styled by
`remix/ui/checkbox`, while retaining its native checked state, label, name, and
`FormData` value. This is a low-risk pilot for Beta 5's first-party controls.

### Medium: pilot `remix/ui/select` in history filters

Status: proposal; requires focused UX and accessibility review.

Paths:

- `client/routes/history.tsx`
- `e2e/ledger.spec.ts`

The three flat history filters are the best candidate for a composed
`remix/ui/select`: they have no option groups and submit through one form.
Unlike a native `select`, the Remix component renders a listbox/popover and a
hidden form input. Adoption must verify keyboard behavior, mobile behavior, form
serialization, server rendering, and URL-synced defaults. Keep the native
controls until that comparison demonstrates a real UX benefit.

The grouped account selectors in `client/routes/home.tsx` are not a suitable
first pilot. They rely on native `optgroup`, mobile picker behavior, and
Playwright's native `selectOption` API.

### Medium: adopt button and input mixins route by route

Status: proposal; do not replace the shared styles globally in one change.

Paths:

- `client/styles/form-controls.ts`
- `client/routes/home.tsx`
- `client/routes/settings.tsx`
- `client/routes/history.tsx`
- `client/routes/login.tsx`
- `client/routes/reset-password.tsx`
- `client/routes/oauth-authorize.tsx`
- `client/routes/account.tsx`

`buttonCss` and `inputCss` are plain style objects that callers spread into many
route-specific variants. Beta 5's `remix/ui/button` and `remix/ui/input` APIs
return mixin descriptors instead, so a global swap would touch most interactive
screens and could change the app's custom pressed-button visual language.
Migrate one route at a time, compose app-owned styles after the first-party
mixin, and compare disabled, focus, hover, and dark-mode states.

### Medium: consolidate modal behavior before considering a primitive

Status: proposal; no Beta 5 dialog component exists.

Paths:

- `client/routes/home.tsx`
- `client/routes/settings.tsx`
- `client/dom-utils.ts`
- `client/kid-modal-background.ts`
- `e2e/home-modal-accessibility.spec.ts`

The transaction, transfer, and custom-CSS modals duplicate focus trapping,
backdrop handling, close animation, and focus restoration. Beta 5 exports
popover primitives but no dialog primitive. A popover is not a drop-in
replacement for the current modal semantics. First extract the tested modal
behavior into an app-owned component; evaluate native `dialog` or a future
first-party dialog separately.

### Low: defer tabs, accordion, breadcrumbs, menu, radio, and toggle

Paths:

- `client/routes/login.tsx`
- `client/routes/settings.tsx`
- `client/app.tsx`

The login/signup switch is URL navigation, not an in-page tab panel. Settings
sections are intentionally always visible and include reorder controls. The app
navigation is flat rather than hierarchical, and there are no menu, radio, or
toggle use cases. Introducing these primitives now would change product behavior
without simplifying current code.

### Low: consider router aliases separately from Beta 5 adoption

Paths:

- `server/router.ts`
- `server/routes.ts`
- `client/client-router.tsx`
- `client/route-loader-data.tsx`

The new template uses `remix/router`, `remix/routes`, middleware, and
`remix/assets`. In Beta 5, the router exports alias the fetch-router package
already used here. Reworking the app's Worker routing, loader envelope, and
Cloudflare Assets integration solely for template parity would be a broad
architectural change with little immediate value.

## `trustProxy` decision

Do not enable `trustProxy` for the current deployment.

`trustProxy` is an option on `remix/node-fetch-server`'s Node request adapter.
This app receives standard `Request` objects directly in the Cloudflare Worker
`fetch` handler (`worker/index.ts`) and never calls `createRequestListener` or
`createRequest`.

Proxy-related behavior is platform-specific and already handled where needed:

- `server/auth-session.ts` considers forwarded protocol when setting secure
  cookies.
- `server/audit-log.ts` prefers Cloudflare's `CF-Connecting-IP` and falls back
  to `X-Forwarded-For`.
- `server/handlers/password-reset.ts` uses `APP_BASE_URL` when configured for
  externally visible links.

If a Node deployment is added later, enable `trustProxy` only when that server
is reachable exclusively through a proxy that overwrites forwarded headers.
Otherwise, clients can spoof URL and client-address metadata.

## Template comparison

The Beta 5 `remix new` template runs a Node HTTP server with:

- `NODE_ENV=production node --import remix/node-tsx server.ts`
- `remix/node-fetch-server`
- `remix/router`, `remix/routes`, and render/static middleware
- `remix/assets`, with production minification
- graceful `SIGINT` and `SIGTERM` shutdown

This repository intentionally runs on Cloudflare Workers with Wrangler, D1, KV,
Durable Objects, scheduled handlers, and an Assets binding. The Node start,
proxy adapter, process signal handling, and Node asset server do not apply. The
production minification behavior is the only clear template improvement to carry
over without changing deployment architecture.
