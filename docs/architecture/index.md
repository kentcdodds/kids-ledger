# Architecture overview

This folder documents the important runtime architecture for `kids-ledger`.

## Core docs

- [Request Lifecycle](./request-lifecycle.md): how requests are routed in the
  Worker.
- [Authentication](./authentication.md): app session auth and OAuth-protected
  MCP auth.
- [Data Storage](./data-storage.md): what is stored in D1, KV, and Durable
  Objects.

## Source of truth in code

- Worker entrypoint: `worker/index.ts`
- Server request handler: `server/handler.ts`
- Router and HTTP route mapping: `server/router.ts` and `server/routes.ts`
- SSR document rendering: `server/ssr-render.tsx` and `server/ssr-document.tsx`
- Client hydration and navigation: `client/app-root.tsx`,
  `client/router-location.tsx`, and `client/client-router.tsx`
- Route loader data: `server/route-loader-data.ts` and
  `client/route-loader-data.tsx`
- OAuth handlers: `worker/oauth-handlers.ts`
- MCP auth checks: `worker/mcp-auth.ts`
- Ledger domain service: `server/ledger/ledger-service.ts`
- Monthly interest job: `server/ledger/monthly-interest.ts`
- Ledger HTTP handlers: `server/handlers/ledger-api.ts`
- Ledger MCP tools: `mcp/tools/ledger-tools.ts`
