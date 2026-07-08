# Request lifecycle

This document explains how an incoming request moves through the system.

## Entry point

All traffic enters the Worker at `worker/index.ts`.

The `fetch` handler is wrapped by `OAuthProvider` from
`@cloudflare/workers-oauth-provider`, which means OAuth endpoints and token
infrastructure are available alongside normal app routes.

## Routing order

Requests are handled in this order:

1. OAuth authorization endpoints:
   - `/oauth/authorize`
   - `/oauth/authorize-info`
   - `/oauth/callback`
2. Browser noise endpoint:
   - `/.well-known/appspecific/com.chrome.devtools.json` (returns 204)
3. OAuth protected resource metadata endpoint:
   - `/.well-known/oauth-protected-resource` (and the `/mcp` variant)
4. MCP endpoint:
   - `/mcp` (requires OAuth bearer token)
5. Static assets:
   - Served from `ASSETS` for `GET` and `HEAD` when available
6. App server routes:
   - Everything else is handled by `server/handler.ts`

## App server flow

`server/handler.ts` validates environment variables and configures session
cookie signing (`COOKIE_SECRET`) before reusing the cached app router for the
current Worker environment object.

`server/router.ts` maps route patterns from `server/routes.ts` to handler
modules (home, auth, account, session, logout, password reset, health).

Document routes render through `server/ssr-render.tsx`, which streams
`server/ssr-document.tsx` with the current URL, public session email, and 404
state embedded for hydration. API routes continue to return JSON or redirects
from their existing handlers.

## Route loader data

Document renders also load route data through `server/route-loader-data.ts` when
the current route has server-readable data. The resulting loader-data envelope
is passed to `client/app-root.tsx`, stored by `client/route-loader-data.tsx`, and
consumed by route components during hydration.

Client-side navigations preload the matching route's `loader` export before the
router commits the new URL. If a loader succeeds, the data is stored as
preloaded navigation data and consumed by the destination route on its first
render after navigation. Successful ledger mutations dispatch a route-data
revalidation event so the active route can reload its loader data without a full
document refresh.

Loader data is consume-once per route/data key. Because consumption mutates a
route component's closure state during render, successful consumption schedules
one corrective follow-up render with `handle.queueTask(() => handle.update())`.
Routes should still consume loader data before deriving list/detail state; the
follow-up render is a safety net for stale derivations and cannot loop because
the data key has already been consumed.

## Client-side navigation flow

The browser hydrates `client/app-root.tsx` through `remix/ui` `clientEntry` and
`run()`. `client/router-location.tsx` keeps the SSR URL and current browser URL
in handle context so server-rendered route matching and SPA navigation share the
same source of truth.

The browser app intercepts same-origin `<a>` clicks and same-origin form
submissions (`GET`/`POST`) and routes them in-place through
`client/client-router.tsx`. Normal app navigations no longer require a full
document refresh.

Full page navigations still occur for:

- Explicit browser reloads/new tab loads
- Cross-origin links/forms
- Non-`_self` form targets (for example, `_blank`)
- Explicit code paths that intentionally call `window.location.assign(...)`

## CORS behavior

`worker/index.ts` wraps the handler with `withCors`:

- CORS headers are only added when `Origin` exactly matches the request origin.
- Allowed methods are `GET, POST, OPTIONS`.
- Allowed headers include `content-type` and `authorization`.

This keeps cross-origin behavior narrow while still allowing same-origin browser
and API requests.
