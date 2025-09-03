import { z } from 'zod'
import { migrate } from './migrations.ts'
import {
	ledgerSchema,
	newLedgerSchema,
	kidSchema,
	newKidSchema,
	accountSchema,
	newAccountSchema,
	updateAccountBalanceSchema,
	updateOrderSchema,
	type Ledger,
	type NewLedger,
	type Kid,
	type NewKid,
	type Account,
	type NewAccount,
} from './schema.ts'
import { sql, snakeToCamel } from './utils.ts'

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

	// Ledger operations
	async createLedger(data: NewLedger) {
		const id = crypto.randomUUID()
		const result = await this.#db
			.prepare(
				sql`
					INSERT INTO ledgers (id, name)
					VALUES (?, ?)
					RETURNING *
				`,
			)
			.bind(id, data.name)
			.first<Ledger>()

		if (!result) throw new Error('Failed to create ledger')
		return ledgerSchema.parse(snakeToCamel(result))
	}

	async getLedger(id: string) {
		const result = await this.#db
			.prepare(sql`SELECT * FROM ledgers WHERE id = ?`)
			.bind(id)
			.first<Ledger>()

		return result ? ledgerSchema.parse(snakeToCamel(result)) : null
	}

	async updateLedger(id: string, data: Partial<NewLedger>) {
		const updates: string[] = []
		const values: any[] = []

		if (data.name !== undefined) {
			updates.push('name = ?')
			values.push(data.name)
		}

		if (updates.length === 0) return this.getLedger(id)

		values.push(id)
		const updateQuery = `UPDATE ledgers SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *`
		const result = await this.#db
			.prepare(updateQuery)
			.bind(...values)
			.first<Ledger>()

		return result ? ledgerSchema.parse(snakeToCamel(result)) : null
	}

	async deleteLedger(id: string) {
		const result = await this.#db
			.prepare(sql`DELETE FROM ledgers WHERE id = ?`)
			.bind(id)
			.run()

		return result.success && result.meta.changes > 0
	}

	// Kid operations
	async createKid(data: NewKid) {
		// Get the next sort order if not provided
		let sortOrder = data.sortOrder
		if (sortOrder === undefined) {
			const maxOrder = await this.#db
				.prepare(
					sql`SELECT MAX(sort_order) as max_order FROM kids WHERE ledger_id = ?`,
				)
				.bind(data.ledgerId)
				.first<{ maxOrder: number | null }>()

			sortOrder = (maxOrder?.maxOrder ?? 0) + 1
		}

		const result = await this.#db
			.prepare(
				sql`
					INSERT INTO kids (ledger_id, name, emoji, sort_order)
					VALUES (?, ?, ?, ?)
					RETURNING *
				`,
			)
			.bind(data.ledgerId, data.name, data.emoji, sortOrder)
			.first<Kid>()

		if (!result) throw new Error('Failed to create kid')
		return kidSchema.parse(snakeToCamel(result))
	}

	async getKidsByLedger(ledgerId: string) {
		const result = await this.#db
			.prepare(
				sql`SELECT * FROM kids WHERE ledger_id = ? ORDER BY sort_order ASC`,
			)
			.bind(ledgerId)
			.all<Kid>()

		return result.results.map((row) => kidSchema.parse(snakeToCamel(row)))
	}

	async getKid(id: number) {
		const result = await this.#db
			.prepare(sql`SELECT * FROM kids WHERE id = ?`)
			.bind(id)
			.first<Kid>()

		return result ? kidSchema.parse(snakeToCamel(result)) : null
	}

	async updateKid(id: number, data: Partial<NewKid>) {
		const updates: string[] = []
		const values: any[] = []

		if (data.name !== undefined) {
			updates.push('name = ?')
			values.push(data.name)
		}
		if (data.emoji !== undefined) {
			updates.push('emoji = ?')
			values.push(data.emoji)
		}

		if (updates.length === 0) return this.getKid(id)

		values.push(id)
		const updateQuery = `UPDATE kids SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *`
		const result = await this.#db
			.prepare(updateQuery)
			.bind(...values)
			.first<Kid>()

		return result ? kidSchema.parse(snakeToCamel(result)) : null
	}

	async deleteKid(id: number) {
		const result = await this.#db
			.prepare(sql`DELETE FROM kids WHERE id = ?`)
			.bind(id)
			.run()

		return result.success && result.meta.changes > 0
	}

	async reorderKid(id: number, newSortOrder: number) {
		// Get the kid to reorder
		const kid = await this.getKid(id)
		if (!kid) return null

		// Update the sort order
		const result = await this.#db
			.prepare(
				sql`
					UPDATE kids 
					SET sort_order = ?, updated_at = CURRENT_TIMESTAMP
					WHERE id = ?
					RETURNING *
				`,
			)
			.bind(newSortOrder, id)
			.first<Kid>()

		return result ? kidSchema.parse(snakeToCamel(result)) : null
	}

	// Account operations
	async createAccount(data: NewAccount) {
		// Get the next sort order if not provided
		let sortOrder = data.sortOrder
		if (sortOrder === undefined) {
			const maxOrder = await this.#db
				.prepare(
					sql`SELECT MAX(sort_order) as max_order FROM accounts WHERE kid_id = ?`,
				)
				.bind(data.kidId)
				.first<{ maxOrder: number | null }>()

			sortOrder = (maxOrder?.maxOrder ?? 0) + 1
		}

		const result = await this.#db
			.prepare(
				sql`
					INSERT INTO accounts (kid_id, name, balance, sort_order)
					VALUES (?, ?, ?, ?)
					RETURNING *
				`,
			)
			.bind(data.kidId, data.name, data.balance, sortOrder)
			.first<Account>()

		if (!result) throw new Error('Failed to create account')
		return accountSchema.parse(snakeToCamel(result))
	}

	async getAccountsByKid(kidId: number) {
		const result = await this.#db
			.prepare(
				sql`SELECT * FROM accounts WHERE kid_id = ? ORDER BY sort_order ASC`,
			)
			.bind(kidId)
			.all<Account>()

		return result.results.map((row) => accountSchema.parse(snakeToCamel(row)))
	}

	async getAccount(id: number) {
		const result = await this.#db
			.prepare(sql`SELECT * FROM accounts WHERE id = ?`)
			.bind(id)
			.first<Account>()

		return result ? accountSchema.parse(snakeToCamel(result)) : null
	}

	async updateAccount(id: number, data: Partial<NewAccount>) {
		const updates: string[] = []
		const values: any[] = []

		if (data.name !== undefined) {
			updates.push('name = ?')
			values.push(data.name)
		}
		if (data.balance !== undefined) {
			updates.push('balance = ?')
			values.push(data.balance)
		}

		if (updates.length === 0) return this.getAccount(id)

		values.push(id)
		const updateQuery = `UPDATE accounts SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *`
		const result = await this.#db
			.prepare(updateQuery)
			.bind(...values)
			.first<Account>()

		return result ? accountSchema.parse(snakeToCamel(result)) : null
	}

	async deleteAccount(id: number) {
		const result = await this.#db
			.prepare(sql`DELETE FROM accounts WHERE id = ?`)
			.bind(id)
			.run()

		return result.success && result.meta.changes > 0
	}

	async reorderAccount(id: number, newSortOrder: number) {
		// Get the account to reorder
		const account = await this.getAccount(id)
		if (!account) return null

		// Update the sort order
		const result = await this.#db
			.prepare(
				sql`
					UPDATE accounts 
					SET sort_order = ?, updated_at = CURRENT_TIMESTAMP
					WHERE id = ?
					RETURNING *
				`,
			)
			.bind(newSortOrder, id)
			.first<Account>()

		return result ? accountSchema.parse(snakeToCamel(result)) : null
	}

	// Utility methods for atomic reordering
	async reorderKidBetween(
		id: number,
		beforeId: number | null,
		afterId: number | null,
	) {
		const kid = await this.getKid(id)
		if (!kid) return null

		let newSortOrder: number

		if (beforeId === null && afterId === null) {
			// Move to the beginning
			newSortOrder = 0
		} else if (beforeId === null) {
			// Move to the beginning (before the first item)
			const afterKid = await this.getKid(afterId!)
			if (!afterKid) return null
			newSortOrder = afterKid.sortOrder / 2
		} else if (afterId === null) {
			// Move to the end
			const beforeKid = await this.getKid(beforeId!)
			if (!beforeKid) return null
			newSortOrder = beforeKid.sortOrder + 1
		} else {
			// Move between two items
			const beforeKid = await this.getKid(beforeId!)
			const afterKid = await this.getKid(afterId!)
			if (!beforeKid || !afterKid) return null
			newSortOrder = (beforeKid.sortOrder + afterKid.sortOrder) / 2
		}

		return this.reorderKid(id, newSortOrder)
	}

	async reorderAccountBetween(
		id: number,
		beforeId: number | null,
		afterId: number | null,
	) {
		const account = await this.getAccount(id)
		if (!account) return null

		let newSortOrder: number

		if (beforeId === null && afterId === null) {
			// Move to the beginning
			newSortOrder = 0
		} else if (beforeId === null) {
			// Move to the beginning (before the first item)
			const afterAccount = await this.getAccount(afterId!)
			if (!afterAccount) return null
			newSortOrder = afterAccount.sortOrder / 2
		} else if (afterId === null) {
			// Move to the end
			const beforeAccount = await this.getAccount(beforeId!)
			if (!beforeAccount) return null
			newSortOrder = beforeAccount.sortOrder + 1
		} else {
			// Move between two items
			const beforeAccount = await this.getAccount(beforeId!)
			const afterAccount = await this.getAccount(afterId!)
			if (!beforeAccount || !afterAccount) return null
			newSortOrder = (beforeAccount.sortOrder + afterAccount.sortOrder) / 2
		}

		return this.reorderAccount(id, newSortOrder)
	}

	// Bulk operations
	async getLedgerWithKids(ledgerId: string) {
		const ledger = await this.getLedger(ledgerId)
		if (!ledger) return null

		const kids = await this.getKidsByLedger(ledgerId)
		return { ledger, kids }
	}

	async getKidWithAccounts(kidId: number) {
		const kid = await this.getKid(kidId)
		if (!kid) return null

		const accounts = await this.getAccountsByKid(kidId)
		return { kid, accounts }
	}

	async getFullLedger(ledgerId: string) {
		const ledger = await this.getLedger(ledgerId)
		if (!ledger) return null

		const kids = await this.getKidsByLedger(ledgerId)
		const kidsWithAccounts = await Promise.all(
			kids.map(async (kid) => {
				const accounts = await this.getAccountsByKid(kid.id)
				return { ...kid, accounts }
			}),
		)

		return { ledger, kids: kidsWithAccounts }
	}
}
