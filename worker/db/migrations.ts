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
					// example sql statements from another app:
					// db.prepare(sql`
					// 	CREATE TABLE IF NOT EXISTS entries (
					// 		id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
					// 		user_id integer NOT NULL,
					// 		title text NOT NULL,
					// 		content text NOT NULL,
					// 		mood text,
					// 		location text,
					// 		weather text,
					// 		is_private integer DEFAULT 1 NOT NULL CHECK (is_private IN (0, 1)),
					// 		is_favorite integer DEFAULT 0 NOT NULL CHECK (is_favorite IN (0, 1)),
					// 		created_at integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
					// 		updated_at integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
					// 		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
					// 	);
					// 	CREATE INDEX IF NOT EXISTS idx_entries_user_id ON entries(user_id);
					// 	CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at);
					// 	CREATE INDEX IF NOT EXISTS idx_entries_is_private ON entries(is_private);
					// `),
					// db.prepare(sql`
					// 	CREATE TABLE IF NOT EXISTS tags (
					// 		id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
					// 		user_id integer NOT NULL,
					// 		name text NOT NULL,
					// 		description text,
					// 		created_at integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
					// 		updated_at integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
					// 		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
					// 		UNIQUE(user_id, name)
					// 	);
					// 	CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
					// `),
					// db.prepare(sql`
					// 	CREATE TABLE IF NOT EXISTS entry_tags (
					// 		id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
					// 		user_id integer NOT NULL,
					// 		entry_id integer NOT NULL,
					// 		tag_id integer NOT NULL,
					// 		created_at integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
					// 		updated_at integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
					// 		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
					// 		FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
					// 		FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
					// 		UNIQUE(entry_id, tag_id)
					// 	);
					// 	CREATE INDEX IF NOT EXISTS idx_entry_tags_user ON entry_tags(user_id);
					// 	CREATE INDEX IF NOT EXISTS idx_entry_tags_entry ON entry_tags(entry_id);
					// 	CREATE INDEX IF NOT EXISTS idx_entry_tags_tag ON entry_tags(tag_id);
					// `),
				])
				console.log('Successfully created all tables')
			} catch (error) {
				console.error('Error in initial schema migration:', error)
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
