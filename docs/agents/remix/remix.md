# remix

Source: https://github.com/remix-run/remix/tree/main/packages/remix

## README

A modern web framework for JavaScript.

See [remix.run](https://remix.run) for framework docs.

## Installation

```sh
npm i remix
```

## Package usage in Remix 3 beta

The `remix` package is used through subpath imports.

- ✅ `import { createRouter } from 'remix/router'`
- ✅ `import { route } from 'remix/routes'`
- ✅ `import { createRoot } from 'remix/ui'`
- ❌ `import { ... } from 'remix'` (root import removed in Remix 3 prereleases)
- ❌ `import { createRouter } from 'remix/fetch-router'` (legacy package-aligned
  aliases removed in `3.0.0-beta.10`)

## Subpath export surface (`3.0.0-beta.10`, selected)

Beta.10 removed the legacy package-aligned aliases (`remix/fetch-router`,
`remix/session-middleware`, `remix/data-table-sqlite`, ...) in favor of
canonical entrypoints that group related APIs together:

- `remix/router` (formerly `remix/fetch-router`)
- `remix/routes` (formerly `remix/fetch-router/routes`)
- `remix/middleware/*`: `async-context`, `auth`, `compression`, `cop`, `cors`,
  `csrf`, `form-data`, `logger`, `method-override`, `render`, `session`,
  `static`
- `remix/data-table` plus dialects `remix/data-table/sqlite`,
  `remix/data-table/postgres`, `remix/data-table/mysql`, and helpers
  `remix/data-table/operators`, `remix/data-table/sql-helpers`,
  `remix/data-table/migrations`
- `remix/file-storage` plus `remix/file-storage/fs`,
  `remix/file-storage/memory`, `remix/file-storage/s3`
- `remix/session` plus `remix/session-storage/cookie`,
  `remix/session-storage/fs`, `remix/session-storage/memory`,
  `remix/session-storage/memcache`, `remix/session-storage/redis`

Unchanged top-level exports used or documented in this repo include:

- `remix/assets`
- `remix/cookie`
- `remix/data-schema` (`/checks`, `/coerce`, `/lazy`, `/form-data`)
- `remix/fetch-proxy`
- `remix/form-data-parser`
- `remix/fs`
- `remix/headers`
- `remix/html-template`
- `remix/lazy-file`
- `remix/mime`
- `remix/multipart-parser` (`/node`)
- `remix/node-fetch-server`
- `remix/response/compress`, `remix/response/file`, `remix/response/html`,
  `remix/response/redirect`
- `remix/route-pattern` (`/href`, `/join`, `/match`, `/specificity`)
- `remix/tar-parser`
- `remix/ui` (`/server`, `/jsx-runtime`, `/jsx-dev-runtime`, plus components)

New in beta.10:

- `remix/node-hmr`, `remix/ui-hmr` (full-stack HMR for Node servers)
- `remix/test`, `remix/test/cli` (run with `remix test`; the `remix-test`
  executable was removed)
- Optional JSONC `remix.json` for shared `remix db`, `remix test`, and
  `remix doctor` settings

## Navigation

- [Remix package index](./index.md)
