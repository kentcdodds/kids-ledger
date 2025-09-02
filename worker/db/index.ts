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
}
