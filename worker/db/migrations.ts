/// <reference path="../../types/worker-configuration.d.ts" />

import { sql } from './utils.ts'

const migrations = [
	{
		version: 1,
		name: 'initial_schema',
		up: async (db: D1Database) => {
			console.log('Starting initial schema migration...')
			try {
				await db.batch([
					db.prepare(sql`
						CREATE TABLE IF NOT EXISTS schema_versions (
							version INTEGER PRIMARY KEY,
							name TEXT NOT NULL,
							applied_at INTEGER DEFAULT (CURRENT_TIMESTAMP) NOT NULL
						);
					`),
				])
				console.log('Successfully created schema_versions table')
			} catch (error) {
				console.error('Error in initial schema migration:', error)
				throw error
			}
		},
	},
	{
		version: 2,
		name: 'kids_expenses_schema',
		up: async (db: D1Database) => {
			console.log('Starting kids expenses schema migration...')
			try {
				await db.batch([
					db.prepare(sql`
						CREATE TABLE IF NOT EXISTS ledgers (
							id TEXT PRIMARY KEY NOT NULL,
							name TEXT NOT NULL,
							created_at INTEGER DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
							updated_at INTEGER DEFAULT (CURRENT_TIMESTAMP) NOT NULL
						);
					`),
					db.prepare(sql`
						CREATE TABLE IF NOT EXISTS kids (
							id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
							ledger_id TEXT NOT NULL,
							name TEXT NOT NULL,
							emoji TEXT NOT NULL,
							created_at INTEGER DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
							updated_at INTEGER DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
							FOREIGN KEY (ledger_id) REFERENCES ledgers(id) ON DELETE CASCADE
						);
						CREATE INDEX IF NOT EXISTS idx_kids_ledger_id ON kids(ledger_id);
					`),
					db.prepare(sql`
						CREATE TABLE IF NOT EXISTS accounts (
							id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
							kid_id INTEGER NOT NULL,
							name TEXT NOT NULL,
							balance INTEGER DEFAULT 0 NOT NULL,
							created_at INTEGER DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
							updated_at INTEGER DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
							FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE CASCADE
						);
						CREATE INDEX IF NOT EXISTS idx_accounts_kid_id ON accounts(kid_id);
					`),
				])
				console.log('Successfully created kids expenses tables')
			} catch (error) {
				console.error('Error in kids expenses schema migration:', error)
				throw error
			}
		},
	},
	// Add future migrations here with incrementing version numbers
]

// Run migrations
export async function migrate(db: D1Database) {
	try {
		// Create schema_versions table if it doesn't exist (this is our first run)
		await db.exec(sql`
			CREATE TABLE IF NOT EXISTS schema_versions (
				version INTEGER PRIMARY KEY,
				name TEXT NOT NULL,
				applied_at INTEGER DEFAULT (CURRENT_TIMESTAMP) NOT NULL
			);
		`)

		// Get the current version
		const result = await db
			.prepare(sql`SELECT MAX(version) as version FROM schema_versions;`)
			.first<{ version: number | null }>()

		const currentVersion = result?.version ?? 0
		let migrationCount = 0

		// Run any migrations that haven't been applied yet
		for (const migration of migrations) {
			if (migration.version > currentVersion) {
				console.log(`Running migration ${migration.version}: ${migration.name}`)
				await migration.up(db)
				await db
					.prepare(
						sql`INSERT INTO schema_versions (version, name) VALUES (?, ?);`,
					)
					.bind(migration.version, migration.name)
					.run()
				console.log(`Completed migration ${migration.version}`)
				migrationCount++
			}
		}
		if (migrationCount > 0) {
			console.log(
				`Migration process completed successfully. ${migrationCount} migrations applied.`,
			)
		}
	} catch (error) {
		console.error('Error during migration process:', error)
		throw error
	}
}
