# Remix adoption audit

Audit date: 2026-09-30

## Status

This repository is pinned to stable `remix@3.0.0`. The app uses Remix's own
versioned workflow and package documentation; see the
[Remix documentation index](./index.md).

## 3.0.0 (stable) upgrade

- The component runtime and JSX runtimes moved from `remix/ui` to
  `remix/component`. This app's imports, JSX configuration, and server renderer
  now use the renamed entrypoints.
- Remix's styled components and style mixins were removed. The login remember-me
  control is a native checkbox styled locally with `css()`.
- Headless primitives moved to the separate, independently versioned
  `@remix-run/ui` 0.x package. This app does not use those primitives and does
  not add the package.
- Migration filename prefixes must all have the same number of digits in a
  directory. This app's `migrations/` prefixes are consistently four digits.
- Remix's Node engine minimum is `>=24.3.0`. The app runs on Cloudflare Workers
  and Bun, so this does not change its runtime requirements.

## rc.3/rc.4 breaking-change audit

| Change                                                                                                 | Applies?       | Evidence/action                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------ | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RouterTypes` augmentation moved to `declare module 'remix'`                                           | No             | The app has no module augmentation.                                                                                                                                                                                                                                               |
| `fetch-proxy` returns upstream redirects                                                               | No             | `remix/fetch-proxy` is not used.                                                                                                                                                                                                                                                  |
| `route-pattern` 0.25 normalizes `createHref` and throws for wildcard `.` / `..`                        | No             | No `.href()` or `createHref` calls; routes use literal paths.                                                                                                                                                                                                                     |
| `remix/ui` `innerHTML` / `srcDoc` require `unsafeHTML()`; `javascript:` URLs are blocked               | No             | No such props or URLs appear in app JSX.                                                                                                                                                                                                                                          |
| An unmounted named frame target causes document navigation; default `resolveFrame` is same-origin only | No             | The app uses only the top frame and does not configure named targets or a custom `resolveFrame`.                                                                                                                                                                                  |
| `Cookie.secure` is undefined when unconfigured; session middleware sets `Secure` on HTTPS              | No             | `server/auth-session.ts` passes `secure` per request using `isSecureRequest`; session middleware is not used.                                                                                                                                                                     |
| Session middleware enforces `maxAge` / `expires` before loading                                        | No             | No session middleware or deploy-triggered forced logout. Cookie lifetimes remain governed by the existing remember-me logic in `server/auth-session.ts`.                                                                                                                          |
| `csrf()` no longer reads a query token                                                                 | No             | CSRF middleware is not used.                                                                                                                                                                                                                                                      |
| `cors({ credentials: true })` retains `*` when no origin is present                                    | No             | CORS handling is hand-rolled in the Worker.                                                                                                                                                                                                                                       |
| Dotted strings for data-table comparisons are scalars; unconditional update/delete is rejected         | Yes, D1 driver | `worker/d1-data-table-adapter.ts` treats only `valueType: 'column'` as a column reference. App `deleteMany` / update calls in `server/handlers/password-reset.ts` and `mock-servers/resend/worker.ts` include filters; core rejects unfiltered writes before invoking the driver. |
| `tar-parser` defaults changed                                                                          | No             | `remix/tar-parser` is not used.                                                                                                                                                                                                                                                   |

## rc.3/rc.4 features

| Feature                                                  | Adoption                                                                                                            |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `data-rmx-preserve-attrs`                                | Adopted on the SSR body to preserve client-owned `style` and `data-kid-modal-open` attributes during frame reloads. |
| Data-table SQL helpers                                   | Adopted in the D1 adapter: `collectColumns`, `compileOrderByDirection`, `normalizeJoinType`, and `quotePath`.       |
| Built-in frame navigation and streamed reloads           | Adopted; obsolete marker-less HTML-template page shells have been removed.                                          |
| Tokenless cross-origin protection                        | Adopted as `cop()` global middleware on the app router; Worker-level OAuth and MCP routes are handled before it.    |
| `X-Remix-Frame` / `X-Remix-Target` header alignment      | Not applicable: the app does not set or detect these frame headers.                                                 |
| `createRequestListener` / `trustProxy` under `node-hmr`  | Not applicable: Cloudflare Workers receive a `Request` directly.                                                    |
| `remix/assets` `FileCache`, barrel, and HMR improvements | Not applicable: assets use esbuild and Wrangler Assets, not `remix/assets`.                                         |
| Compression streaming                                    | Not applicable: Cloudflare handles response compression.                                                            |
| Expanded Remix test patterns                             | Not applicable: the project uses `bun test` and Playwright.                                                         |
| Lowercase `sameSite` values                              | No change needed; the existing uppercase value remains accepted.                                                    |

## Prioritized adoption recommendations

### Adopted: production asset minification

Production browser assets are minified by the esbuild scripts in `package.json`;
development watch scripts remain readable. Production runs in Wrangler on
Cloudflare Workers, not a Node server.

### Adopted: native styled login checkbox

The remember-me checkbox in `client/routes/login.tsx` is a native checkbox
styled with app-local `css()`. It retains native checked state and form
semantics now that Remix's styled checkbox is removed.

### Adopted: URL-synced history filter selections

The history route marks native select options as selected from the URL filters,
so applying filters and reloading keeps the active kid, account, and type
visible.

### Declined: replace native history filters with `@remix-run/ui/select`

The only remaining select primitive is the headless `@remix-run/ui/select`
package, which requires app-owned markup and behavior and is independently
versioned and unstable. Do not add it for the three flat history filters: native
controls already provide the required keyboard/mobile behavior, form
serialization, SSR, and URL-synced defaults. The grouped account selectors on
the home route also rely on `optgroup`, native mobile picker behavior, and
Playwright's `selectOption`.

### Medium: keep app-owned button and input styles route by route

`buttonCss` and `inputCss` are app-owned styles shared across route variants.
Remix's styled button and input components are removed; keep these styles
app-owned and compare disabled, focus, hover, and dark-mode states before
changing individual routes.

### Medium: consolidate modal behavior before considering a primitive

Transaction, transfer, and custom-CSS modals share focus trapping, backdrop,
close animation, and focus restoration behavior. Extract the tested app-owned
behavior before considering native `dialog` or a future first-party dialog;
popover primitives are not a drop-in modal replacement.

### Low: defer tabs, accordion, breadcrumbs, menu, radio, and toggle

The login/signup switch is URL navigation, settings sections are always visible,
and app navigation is flat. These primitives currently have no matching product
use case.

### Low: consider router aliases separately

The app uses `remix/router` and `remix/routes`, but its Worker routing, loader
envelope, and Cloudflare Assets integration are app-specific. Avoid a broad
architecture change solely for template parity.

## `trustProxy` decision

Do not enable `trustProxy` for the current deployment. `trustProxy` applies to
the Node request adapter; the Cloudflare Worker receives standard `Request`
objects directly and does not use `createRequestListener` or `createRequest`.

Proxy-related behavior is already handled where needed:

- `server/auth-session.ts` considers forwarded protocol when setting secure
  cookies.
- `server/audit-log.ts` prefers Cloudflare's `CF-Connecting-IP` and falls back
  to `X-Forwarded-For`.
- `server/handlers/password-reset.ts` uses `APP_BASE_URL` for externally visible
  links when configured.

If a Node deployment is added, enable `trustProxy` only when the server is
reachable exclusively through a proxy that overwrites forwarded headers.

## Template comparison

The Remix Node template uses `remix/node-fetch-server`, a Node start command,
`remix/assets`, and process-signal handling. This repository uses Cloudflare
Workers, Wrangler, D1, KV, Durable Objects, scheduled handlers, and an Assets
binding. The Node server and asset adapter do not apply; production minification
was carried over without changing deployment architecture.

## rc.1/rc.2 migration notes

- `addEventListeners()` was removed from `remix/ui`; use native
  `target.addEventListener(type, listener, { signal })`.
- Framework-owned DOM attributes moved into the `data-rmx-*` namespace.
- `remix/router` returns `405 Method Not Allowed` with an `Allow` header for a
  matching path with the wrong method, and serves `HEAD` through `GET` routes.
- Frames render HTML `3xx` / `4xx` responses. Built-in frame navigation and
  browser fallback behavior replaced the app's separate client router.
