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
	async createLedger(data: NewLedger): Promise<Ledger> {
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
		return snakeToCamel(result) as Ledger
	}

	async getLedger(id: string): Promise<Ledger | null> {
		const result = await this.#db
			.prepare(sql`SELECT * FROM ledgers WHERE id = ?`)
			.bind(id)
			.first<Ledger>()

		return result ? (snakeToCamel(result) as Ledger) : null
	}

	async updateLedger(id: string, data: Partial<NewLedger>): Promise<Ledger | null> {
		const updates: string[] = []
		const values: any[] = []

		if (data.name !== undefined) {
			updates.push('name = ?')
			values.push(data.name)
		}

		if (updates.length === 0) return this.getLedger(id)

		values.push(id)
		const result = await this.#db
			.prepare(
				sql`
					UPDATE ledgers 
					SET ${sql.raw(updates.join(', '))}, updated_at = CURRENT_TIMESTAMP
					WHERE id = ?
					RETURNING *
				`,
			)
			.bind(...values)
			.first<Ledger>()

		return result ? (snakeToCamel(result) as Ledger) : null
	}

	async deleteLedger(id: string): Promise<boolean> {
		const result = await this.#db
			.prepare(sql`DELETE FROM ledgers WHERE id = ?`)
			.bind(id)
			.run()

		return result.changes > 0
	}

	// Kid operations
	async createKid(data: NewKid): Promise<Kid> {
		// Get the next order index if not provided
		let orderIndex = data.orderIndex
		if (orderIndex === undefined) {
			const maxOrder = await this.#db
				.prepare(
					sql`SELECT MAX(order_index) as max_order FROM kids WHERE ledger_id = ?`,
				)
				.bind(data.ledgerId)
				.first<{ maxOrder: number | null }>()

			orderIndex = (maxOrder?.maxOrder ?? -1) + 1
		}

		const result = await this.#db
			.prepare(
				sql`
					INSERT INTO kids (ledger_id, name, emoji, order_index)
					VALUES (?, ?, ?, ?)
					RETURNING *
				`,
			)
			.bind(data.ledgerId, data.name, data.emoji, orderIndex)
			.first<Kid>()

		if (!result) throw new Error('Failed to create kid')
		return snakeToCamel(result) as Kid
	}

	async getKidsByLedger(ledgerId: string): Promise<Kid[]> {
		const result = await this.#db
			.prepare(
				sql`SELECT * FROM kids WHERE ledger_id = ? ORDER BY order_index ASC`,
			)
			.bind(ledgerId)
			.all<Kid>()

		return result.results.map((row) => snakeToCamel(row) as Kid)
	}

	async getKid(id: number): Promise<Kid | null> {
		const result = await this.#db
			.prepare(sql`SELECT * FROM kids WHERE id = ?`)
			.bind(id)
			.first<Kid>()

		return result ? (snakeToCamel(result) as Kid) : null
	}

	async updateKid(id: number, data: Partial<NewKid>): Promise<Kid | null> {
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
		const result = await this.#db
			.prepare(
				sql`
					UPDATE kids 
					SET ${sql.raw(updates.join(', '))}, updated_at = CURRENT_TIMESTAMP
					WHERE id = ?
					RETURNING *
				`,
			)
			.bind(...values)
			.first<Kid>()

		return result ? (snakeToCamel(result) as Kid) : null
	}

	async deleteKid(id: number): Promise<boolean> {
		const result = await this.#db
			.prepare(sql`DELETE FROM kids WHERE id = ?`)
			.bind(id)
			.run()

		return result.changes > 0
	}

	async reorderKid(id: number, newOrderIndex: number): Promise<Kid | null> {
		// Get the kid to reorder
		const kid = await this.getKid(id)
		if (!kid) return null

		// Update the order index
		const result = await this.#db
			.prepare(
				sql`
					UPDATE kids 
					SET order_index = ?, updated_at = CURRENT_TIMESTAMP
					WHERE id = ?
					RETURNING *
				`,
			)
			.bind(newOrderIndex, id)
			.first<Kid>()

		return result ? (snakeToCamel(result) as Kid) : null
	}

	// Account operations
	async createAccount(data: NewAccount): Promise<Account> {
		// Get the next order index if not provided
		let orderIndex = data.orderIndex
		if (orderIndex === undefined) {
			const maxOrder = await this.#db
				.prepare(
					sql`SELECT MAX(order_index) as max_order FROM accounts WHERE kid_id = ?`,
				)
				.bind(data.kidId)
				.first<{ maxOrder: number | null }>()

			orderIndex = (maxOrder?.maxOrder ?? -1) + 1
		}

		const result = await this.#db
			.prepare(
				sql`
					INSERT INTO accounts (kid_id, name, balance, order_index)
					VALUES (?, ?, ?, ?)
					RETURNING *
				`,
			)
			.bind(data.kidId, data.name, data.balance, orderIndex)
			.first<Account>()

		if (!result) throw new Error('Failed to create account')
		return snakeToCamel(result) as Account
	}

	async getAccountsByKid(kidId: number): Promise<Account[]> {
		const result = await this.#db
			.prepare(
				sql`SELECT * FROM accounts WHERE kid_id = ? ORDER BY order_index ASC`,
			)
			.bind(kidId)
			.all<Account>()

		return result.results.map((row) => snakeToCamel(row) as Account)
	}

	async getAccount(id: number): Promise<Account | null> {
		const result = await this.#db
			.prepare(sql`SELECT * FROM accounts WHERE id = ?`)
			.bind(id)
			.first<Account>()

		return result ? (snakeToCamel(result) as Account) : null
	}

	async updateAccount(id: number, data: Partial<NewAccount>): Promise<Account | null> {
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
		const result = await this.#db
			.prepare(
				sql`
					UPDATE accounts 
					SET ${sql.raw(updates.join(', '))}, updated_at = CURRENT_TIMESTAMP
					WHERE id = ?
					RETURNING *
				`,
			)
			.bind(...values)
			.first<Account>()

		return result ? (snakeToCamel(result) as Account) : null
	}

	async deleteAccount(id: number): Promise<boolean> {
		const result = await this.#db
			.prepare(sql`DELETE FROM accounts WHERE id = ?`)
			.bind(id)
			.run()

		return result.changes > 0
	}

	async reorderAccount(id: number, newOrderIndex: number): Promise<Account | null> {
		// Get the account to reorder
		const account = await this.getAccount(id)
		if (!account) return null

		// Update the order index
		const result = await this.#db
			.prepare(
				sql`
					UPDATE accounts 
					SET order_index = ?, updated_at = CURRENT_TIMESTAMP
					WHERE id = ?
					RETURNING *
				`,
			)
			.bind(newOrderIndex, id)
			.first<Account>()

		return result ? (snakeToCamel(result) as Account) : null
	}

	// Utility methods for atomic reordering
	async reorderKidBetween(id: number, beforeId: number | null, afterId: number | null): Promise<Kid | null> {
		const kid = await this.getKid(id)
		if (!kid) return null

		let newOrderIndex: number

		if (beforeId === null && afterId === null) {
			// Move to the beginning
			newOrderIndex = 0
		} else if (beforeId === null) {
			// Move to the beginning (before the first item)
			const afterKid = await this.getKid(afterId!)
			if (!afterKid) return null
			newOrderIndex = afterKid.orderIndex / 2
		} else if (afterId === null) {
			// Move to the end
			const beforeKid = await this.getKid(beforeId!)
			if (!beforeKid) return null
			newOrderIndex = beforeKid.orderIndex + 1
		} else {
			// Move between two items
			const beforeKid = await this.getKid(beforeId!)
			const afterKid = await this.getKid(afterId!)
			if (!beforeKid || !afterKid) return null
			newOrderIndex = (beforeKid.orderIndex + afterKid.orderIndex) / 2
		}

		return this.reorderKid(id, newOrderIndex)
	}

	async reorderAccountBetween(id: number, beforeId: number | null, afterId: number | null): Promise<Account | null> {
		const account = await this.getAccount(id)
		if (!account) return null

		let newOrderIndex: number

		if (beforeId === null && afterId === null) {
			// Move to the beginning
			newOrderIndex = 0
		} else if (beforeId === null) {
			// Move to the beginning (before the first item)
			const afterAccount = await this.getAccount(afterId!)
			if (!afterAccount) return null
			newOrderIndex = afterAccount.orderIndex / 2
		} else if (afterId === null) {
			// Move to the end
			const beforeAccount = await this.getAccount(beforeId!)
			if (!beforeAccount) return null
			newOrderIndex = beforeAccount.orderIndex + 1
		} else {
			// Move between two items
			const beforeAccount = await this.getAccount(beforeId!)
			const afterAccount = await this.getAccount(afterId!)
			if (!beforeAccount || !afterAccount) return null
			newOrderIndex = (beforeAccount.orderIndex + afterAccount.orderIndex) / 2
		}

		return this.reorderAccount(id, newOrderIndex)
	}

	// Bulk operations
	async getLedgerWithKids(ledgerId: string): Promise<{ ledger: Ledger; kids: Kid[] } | null> {
		const ledger = await this.getLedger(ledgerId)
		if (!ledger) return null

		const kids = await this.getKidsByLedger(ledgerId)
		return { ledger, kids }
	}

	async getKidWithAccounts(kidId: number): Promise<{ kid: Kid; accounts: Account[] } | null> {
		const kid = await this.getKid(kidId)
		if (!kid) return null

		const accounts = await this.getAccountsByKid(kidId)
		return { kid, accounts }
	}

	async getFullLedger(ledgerId: string): Promise<{ ledger: Ledger; kids: (Kid & { accounts: Account[] })[] } | null> {
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
