# data-table

Source: https://github.com/remix-run/remix/tree/main/packages/data-table

## README

`data-table` is a typed relational query toolkit with a shared API across SQL
adapters.

## Features

- Query builder + CRUD helpers
- Typed selects and relation loading
- Schema-validated writes via `remix/data-schema`
- Transaction support and adapter capability detection

## Installation

```sh
npm i remix
```

Install a database driver for your adapter:

- Postgres: `npm i pg`
- MySQL: `npm i mysql2`
- SQLite: `npm i better-sqlite3`

## Usage

```ts
import * as s from 'remix/data-schema'
import { createDatabase, createTable } from 'remix/data-table'
import { createSqliteDatabaseAdapter } from 'remix/data-table-sqlite'
import Database from 'better-sqlite3'

let users = createTable({
	name: 'users',
	columns: {
		id: s.string(),
		email: s.string(),
	},
})

let sqlite = new Database('app.db')
let db = createDatabase(createSqliteDatabaseAdapter(sqlite))

let allUsers = await db.query(users).select().all()
```

## kids-ledger note (Cloudflare D1)

This repository uses `remix/data-table` for D1-backed app and mock-server data
access, but D1 is not a `better-sqlite3` connection. We use a custom adapter at
`worker/d1-data-table-adapter.ts` and build the runtime in `worker/db.ts`:

```ts
import { createDatabase } from 'remix/data-table'
import { createD1DataTableAdapter } from '#worker/d1-data-table-adapter.ts'

let db = createDatabase(createD1DataTableAdapter(env.APP_DB))
```

Table metadata and shared table definitions live in `worker/db.ts`.

## kids-ledger preference and exception

Prefer `remix/data-table` for all new D1 access by default.

Why this is the default:

- centralizes table metadata and runtime wiring in `worker/db.ts`
- provides typed CRUD/query helpers for common operations
- keeps patterns consistent across app handlers, mock servers, and MCP tools

Documented exception:

- `server/ledger/ledger-service.ts` uses direct prepared SQL against D1
  intentionally
- ledger operations rely on custom joins, aggregates, and report-style read
  shapes that are simpler to express and optimize in SQL
- this exception is scoped to the ledger domain service to keep direct SQL in a
  single, well-defined boundary

## Adapter packages

- `remix/data-table-postgres`
- `remix/data-table-mysql`
- `remix/data-table-sqlite`

## Related packages

- [`data-schema`](https://github.com/remix-run/remix/tree/main/packages/data-schema) -
  parsing and validation primitives used by table definitions
- [`data-table-postgres`](https://github.com/remix-run/remix/tree/main/packages/data-table-postgres)
- [`data-table-mysql`](https://github.com/remix-run/remix/tree/main/packages/data-table-mysql)
- [`data-table-sqlite`](https://github.com/remix-run/remix/tree/main/packages/data-table-sqlite)

## License

See [LICENSE](https://github.com/remix-run/remix/blob/main/LICENSE)

## Navigation

- [Remix package index](./index.md)
