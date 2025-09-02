// import { z } from 'zod'
import { migrate } from './migrations.ts'
// import { } from './schema.ts'
// import { sql, snakeToCamel } from './utils.ts'

export class DB {
	#db: D1Database
	constructor(db: D1Database) {
		this.#db = db
	}

	static async getInstance(env: Env) {
		const db = new DB(env.KIDS_LEDGER_DB)
		await migrate(env.KIDS_LEDGER_DB)
		return db
	}

	// fill this with utilities for querying the d1 sqlite database.
	// ensure that everything is parsed with zod schemas so it's type safe coming out of the db.
}
