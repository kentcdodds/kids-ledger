import { invariant } from '@epic-web/invariant'

const defaultQuickAmounts = [25, 50, 100, 500, 1000, 2000] as const

export type LedgerAccount = {
	id: number
	kidId: number
	name: string
	colorToken: string
	sortOrder: number
	isArchived: boolean
	balanceCents: number
}

export type LedgerKid = {
	id: number
	householdId: number
	name: string
	emoji: string
	sortOrder: number
	isArchived: boolean
	totalBalanceCents: number
	accounts: Array<LedgerAccount>
}

export type LedgerDashboard = {
	householdId: number
	householdName: string
	familyBalanceCents: number
	kids: Array<LedgerKid>
	quickAmounts: Array<number>
}

export type LedgerTransaction = {
	id: number
	householdId: number
	kidId: number
	kidName: string
	accountId: number
	accountName: string
	amountCents: number
	note: string
	createdAt: string
}

type RunResult = D1Result<unknown>
type QueryRow = Record<string, unknown>

export class LedgerService {
	#db: D1Database
	#userId: number

	constructor(db: D1Database, userId: number) {
		this.#db = db
		this.#userId = userId
	}

	async getDashboard(): Promise<LedgerDashboard> {
		const household = await this.#ensureHousehold()
		const kids = await this.#listKids(household.id, false)
		const quickAmounts = await this.listQuickAmounts()
		let familyBalanceCents = 0
		for (const kid of kids) {
			familyBalanceCents += kid.totalBalanceCents
		}
		return {
			householdId: household.id,
			householdName: household.name,
			familyBalanceCents,
			kids,
			quickAmounts,
		}
	}

	async listKidsWithAccounts(includeArchived: boolean) {
		const household = await this.#ensureHousehold()
		return this.#listKids(household.id, includeArchived)
	}

	async listArchived() {
		const household = await this.#ensureHousehold()
		const kids = await this.#all(
			`SELECT id, name, emoji, sort_order
			 FROM kids
			 WHERE household_id = ? AND is_archived = 1
			 ORDER BY updated_at DESC, id DESC`,
			[household.id],
		)
		const accounts = await this.#all(
			`SELECT a.id, a.name, a.color_token, a.sort_order, a.kid_id, k.name AS kid_name
			 FROM accounts a
			 INNER JOIN kids k ON k.id = a.kid_id
			 WHERE k.household_id = ? AND a.is_archived = 1
			 ORDER BY a.updated_at DESC, a.id DESC`,
			[household.id],
		)
		return {
			kids: kids.map((kid) => ({
				id: getNumber(kid.id),
				name: getString(kid.name),
				emoji: getString(kid.emoji),
				sortOrder: getNumber(kid.sort_order),
			})),
			accounts: accounts.map((account) => ({
				id: getNumber(account.id),
				name: getString(account.name),
				colorToken: getString(account.color_token),
				sortOrder: getNumber(account.sort_order),
				kidId: getNumber(account.kid_id),
				kidName: getString(account.kid_name),
			})),
		}
	}

	async createKid(input: { name: string; emoji: string }) {
		const household = await this.#ensureHousehold()
		const nextSortOrder = await this.#nextSortOrder(
			'kids',
			'household_id',
			household.id,
		)
		const inserted = await this.#run(
			`INSERT INTO kids (household_id, name, emoji, sort_order)
			 VALUES (?, ?, ?, ?)`,
			[household.id, input.name.trim(), input.emoji.trim(), nextSortOrder],
		)
		const kidId = inserted.meta?.last_row_id
		invariant(typeof kidId === 'number', 'Could not create kid.')
		return { id: kidId }
	}

	async updateKid(input: { kidId: number; name: string; emoji: string }) {
		const kid = await this.#requireKid(input.kidId)
		await this.#run(
			`UPDATE kids
			 SET name = ?, emoji = ?, updated_at = CURRENT_TIMESTAMP
			 WHERE id = ?`,
			[input.name.trim(), input.emoji.trim(), kid.id],
		)
	}

	async reorderKids(kidIds: Array<number>) {
		const household = await this.#ensureHousehold()
		await this.#validateKidOrder(household.id, kidIds)
		for (let index = 0; index < kidIds.length; index += 1) {
			await this.#run(
				`UPDATE kids
				 SET sort_order = ?, updated_at = CURRENT_TIMESTAMP
				 WHERE id = ? AND household_id = ?`,
				[index, kidIds[index], household.id],
			)
		}
	}

	async archiveKid(kidId: number) {
		const kid = await this.#requireKid(kidId)
		await this.#run(
			`UPDATE kids
			 SET is_archived = 1, archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
			 WHERE id = ?`,
			[kid.id],
		)
	}

	async unarchiveKid(kidId: number) {
		const kid = await this.#requireKid(kidId)
		await this.#run(
			`UPDATE kids
			 SET is_archived = 0, archived_at = '', updated_at = CURRENT_TIMESTAMP
			 WHERE id = ?`,
			[kid.id],
		)
	}

	async deleteKidPermanently(kidId: number) {
		const kid = await this.#requireKid(kidId)
		if (!kid.isArchived) {
			throw new Error('Kid must be archived before permanent deletion.')
		}
		await this.#run(`DELETE FROM transactions WHERE kid_id = ?`, [kid.id])
		await this.#run(`DELETE FROM accounts WHERE kid_id = ?`, [kid.id])
		await this.#run(`DELETE FROM kids WHERE id = ?`, [kid.id])
	}

	async createAccount(input: {
		kidId: number
		name: string
		colorToken: string
	}) {
		const kid = await this.#requireKid(input.kidId)
		const nextSortOrder = await this.#nextSortOrder(
			'accounts',
			'kid_id',
			kid.id,
		)
		const inserted = await this.#run(
			`INSERT INTO accounts (kid_id, name, color_token, sort_order)
			 VALUES (?, ?, ?, ?)`,
			[kid.id, input.name.trim(), input.colorToken.trim(), nextSortOrder],
		)
		const accountId = inserted.meta?.last_row_id
		invariant(typeof accountId === 'number', 'Could not create account.')
		return { id: accountId }
	}

	async updateAccount(input: {
		accountId: number
		name: string
		colorToken: string
	}) {
		const account = await this.#requireAccount(input.accountId)
		await this.#run(
			`UPDATE accounts
			 SET name = ?, color_token = ?, updated_at = CURRENT_TIMESTAMP
			 WHERE id = ?`,
			[input.name.trim(), input.colorToken.trim(), account.id],
		)
	}

	async reorderAccounts(input: { kidId: number; accountIds: Array<number> }) {
		const kid = await this.#requireKid(input.kidId)
		const rows = await this.#all(
			`SELECT id FROM accounts WHERE kid_id = ? AND is_archived = 0 ORDER BY id`,
			[kid.id],
		)
		const existingIds = rows
			.map((row) => getNumber(row.id))
			.sort((a, b) => a - b)
		const provided = [...input.accountIds].sort((a, b) => a - b)
		if (existingIds.length !== provided.length) {
			throw new Error('Reorder payload does not include all active accounts.')
		}
		for (let index = 0; index < existingIds.length; index += 1) {
			if (existingIds[index] !== provided[index]) {
				throw new Error('Reorder payload contains invalid account IDs.')
			}
		}
		for (let index = 0; index < input.accountIds.length; index += 1) {
			await this.#run(
				`UPDATE accounts
				 SET sort_order = ?, updated_at = CURRENT_TIMESTAMP
				 WHERE id = ? AND kid_id = ?`,
				[index, input.accountIds[index], kid.id],
			)
		}
	}

	async archiveAccount(accountId: number) {
		const account = await this.#requireAccount(accountId)
		await this.#run(
			`UPDATE accounts
			 SET is_archived = 1, archived_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
			 WHERE id = ?`,
			[account.id],
		)
	}

	async unarchiveAccount(accountId: number) {
		const account = await this.#requireAccount(accountId)
		const kid = await this.#requireKid(account.kidId)
		if (kid.isArchived) {
			throw new Error('Account cannot be unarchived while kid is archived.')
		}
		await this.#run(
			`UPDATE accounts
			 SET is_archived = 0, archived_at = '', updated_at = CURRENT_TIMESTAMP
			 WHERE id = ?`,
			[account.id],
		)
	}

	async deleteAccountPermanently(accountId: number) {
		const account = await this.#requireAccount(accountId)
		if (!account.isArchived) {
			throw new Error('Account must be archived before permanent deletion.')
		}
		await this.#run(`DELETE FROM transactions WHERE account_id = ?`, [
			account.id,
		])
		await this.#run(`DELETE FROM accounts WHERE id = ?`, [account.id])
	}

	async addTransaction(input: {
		accountId: number
		amountCents: number
		note?: string
	}) {
		if (!Number.isInteger(input.amountCents) || input.amountCents === 0) {
			throw new Error('amountCents must be a non-zero integer.')
		}
		const account = await this.#requireAccount(input.accountId)
		if (account.isArchived) {
			throw new Error('Archived accounts cannot receive transactions.')
		}

		await this.#run(
			`INSERT INTO transactions (household_id, kid_id, account_id, amount_cents, note)
			 VALUES (?, ?, ?, ?, ?)`,
			[
				account.householdId,
				account.kidId,
				account.id,
				input.amountCents,
				(input.note ?? '').trim(),
			],
		)

		const balance = await this.#getAccountBalance(account.id)
		return {
			accountId: account.id,
			balanceCents: balance,
			warning:
				balance < 0
					? 'This account balance is negative after this transaction.'
					: null,
		}
	}

	async listTransactions(input: {
		kidId?: number
		accountId?: number
		type?: 'add' | 'remove'
		from?: string
		to?: string
		limit?: number
		offset?: number
	}) {
		const household = await this.#ensureHousehold()
		const params: Array<unknown> = [household.id]
		const whereClauses = ['t.household_id = ?']
		if (input.kidId) {
			whereClauses.push('t.kid_id = ?')
			params.push(input.kidId)
		}
		if (input.accountId) {
			whereClauses.push('t.account_id = ?')
			params.push(input.accountId)
		}
		if (input.type === 'add') {
			whereClauses.push('t.amount_cents > 0')
		}
		if (input.type === 'remove') {
			whereClauses.push('t.amount_cents < 0')
		}
		if (input.from) {
			whereClauses.push('t.created_at >= ?')
			params.push(input.from)
		}
		if (input.to) {
			whereClauses.push('t.created_at <= ?')
			params.push(input.to)
		}

		const limit = Math.min(Math.max(input.limit ?? 50, 1), 200)
		const offset = Math.max(input.offset ?? 0, 0)
		params.push(limit, offset)

		const rows = await this.#all(
			`SELECT
				t.id,
				t.household_id,
				t.kid_id,
				k.name AS kid_name,
				t.account_id,
				a.name AS account_name,
				t.amount_cents,
				t.note,
				t.created_at
			 FROM transactions t
			 INNER JOIN kids k ON k.id = t.kid_id
			 INNER JOIN accounts a ON a.id = t.account_id
			 WHERE ${whereClauses.join(' AND ')}
			 ORDER BY t.created_at DESC, t.id DESC
			 LIMIT ? OFFSET ?`,
			params,
		)

		return rows.map((row) => ({
			id: getNumber(row.id),
			householdId: getNumber(row.household_id),
			kidId: getNumber(row.kid_id),
			kidName: getString(row.kid_name),
			accountId: getNumber(row.account_id),
			accountName: getString(row.account_name),
			amountCents: getNumber(row.amount_cents),
			note: getString(row.note),
			createdAt: getString(row.created_at),
		})) satisfies Array<LedgerTransaction>
	}

	async listQuickAmounts() {
		const household = await this.#ensureHousehold()
		await this.#ensureDefaultQuickAmounts(household.id)
		const rows = await this.#all(
			`SELECT amount_cents
			 FROM quick_amount_presets
			 WHERE household_id = ?
			 ORDER BY sort_order ASC, id ASC`,
			[household.id],
		)
		return rows.map((row) => getNumber(row.amount_cents))
	}

	async setQuickAmounts(amounts: Array<number>) {
		const household = await this.#ensureHousehold()
		const normalized = amounts
			.filter((value) => Number.isInteger(value) && value > 0)
			.slice(0, 12)
		if (normalized.length === 0) {
			throw new Error('At least one positive quick amount is required.')
		}
		await this.#run(`DELETE FROM quick_amount_presets WHERE household_id = ?`, [
			household.id,
		])
		for (let index = 0; index < normalized.length; index += 1) {
			await this.#run(
				`INSERT INTO quick_amount_presets (household_id, amount_cents, sort_order)
				 VALUES (?, ?, ?)`,
				[household.id, normalized[index], index],
			)
		}
	}

	async exportLedgerData() {
		const household = await this.#ensureHousehold()
		const kids = await this.#all(
			`SELECT id, name, emoji, sort_order, is_archived, archived_at, created_at, updated_at
			 FROM kids
			 WHERE household_id = ?
			 ORDER BY sort_order ASC, id ASC`,
			[household.id],
		)
		const accounts = await this.#all(
			`SELECT a.id, a.kid_id, a.name, a.color_token, a.sort_order, a.is_archived, a.archived_at, a.created_at, a.updated_at
			 FROM accounts a
			 INNER JOIN kids k ON k.id = a.kid_id
			 WHERE k.household_id = ?
			 ORDER BY a.sort_order ASC, a.id ASC`,
			[household.id],
		)
		const transactions = await this.#all(
			`SELECT id, household_id, kid_id, account_id, amount_cents, note, created_at
			 FROM transactions
			 WHERE household_id = ?
			 ORDER BY created_at DESC, id DESC`,
			[household.id],
		)
		const quickAmounts = await this.listQuickAmounts()

		return {
			version: 1,
			exportedAt: new Date().toISOString(),
			household: {
				id: household.id,
				name: household.name,
				userId: household.userId,
			},
			kids: kids.map((kid) => ({
				id: getNumber(kid.id),
				name: getString(kid.name),
				emoji: getString(kid.emoji),
				sortOrder: getNumber(kid.sort_order),
				isArchived: getBoolean(kid.is_archived),
				archivedAt: getString(kid.archived_at),
				createdAt: getString(kid.created_at),
				updatedAt: getString(kid.updated_at),
			})),
			accounts: accounts.map((account) => ({
				id: getNumber(account.id),
				kidId: getNumber(account.kid_id),
				name: getString(account.name),
				colorToken: getString(account.color_token),
				sortOrder: getNumber(account.sort_order),
				isArchived: getBoolean(account.is_archived),
				archivedAt: getString(account.archived_at),
				createdAt: getString(account.created_at),
				updatedAt: getString(account.updated_at),
			})),
			transactions: transactions.map((transaction) => ({
				id: getNumber(transaction.id),
				householdId: getNumber(transaction.household_id),
				kidId: getNumber(transaction.kid_id),
				accountId: getNumber(transaction.account_id),
				amountCents: getNumber(transaction.amount_cents),
				note: getString(transaction.note),
				createdAt: getString(transaction.created_at),
			})),
			quickAmounts,
		}
	}

	async #ensureHousehold() {
		const existing = await this.#first(
			`SELECT id, user_id, name FROM households WHERE user_id = ?`,
			[this.#userId],
		)
		if (existing) {
			return {
				id: getNumber(existing.id),
				userId: getNumber(existing.user_id),
				name: getString(existing.name),
			}
		}
		const inserted = await this.#run(
			`INSERT OR IGNORE INTO households (user_id, name) VALUES (?, ?)`,
			[this.#userId, 'My Household'],
		)
		const id =
			typeof inserted.meta?.last_row_id === 'number'
				? inserted.meta.last_row_id
				: null
		if (id === null) {
			const household = await this.#first(
				`SELECT id, user_id, name FROM households WHERE user_id = ?`,
				[this.#userId],
			)
			invariant(household, 'Could not create household.')
			return {
				id: getNumber(household.id),
				userId: getNumber(household.user_id),
				name: getString(household.name),
			}
		}
		await this.#ensureDefaultQuickAmounts(id)
		return { id, userId: this.#userId, name: 'My Household' }
	}

	async #ensureDefaultQuickAmounts(householdId: number) {
		const existing = await this.#first(
			`SELECT id FROM quick_amount_presets WHERE household_id = ?`,
			[householdId],
		)
		if (existing) return
		for (let index = 0; index < defaultQuickAmounts.length; index += 1) {
			await this.#run(
				`INSERT OR IGNORE INTO quick_amount_presets (household_id, amount_cents, sort_order)
				 VALUES (?, ?, ?)`,
				[householdId, defaultQuickAmounts[index], index],
			)
		}
	}

	async #nextSortOrder(
		tableName: 'kids' | 'accounts',
		key: string,
		value: number,
	) {
		const row = await this.#first(
			`SELECT COALESCE(MAX(sort_order), -1) AS max_order
			 FROM ${tableName}
			 WHERE ${key} = ? AND is_archived = 0`,
			[value],
		)
		return getNumber(row?.max_order ?? -1) + 1
	}

	async #requireKid(kidId: number) {
		const row = await this.#first(
			`SELECT id, household_id, is_archived
			 FROM kids
			 WHERE id = ?`,
			[kidId],
		)
		if (!row) {
			throw new Error('Kid not found.')
		}
		const household = await this.#ensureHousehold()
		const householdId = getNumber(row.household_id)
		if (householdId !== household.id) {
			throw new Error('Kid does not belong to this household.')
		}
		return {
			id: getNumber(row.id),
			householdId,
			isArchived: getBoolean(row.is_archived),
		}
	}

	async #requireAccount(accountId: number) {
		const row = await this.#first(
			`SELECT
				a.id,
				a.kid_id,
				a.is_archived,
				k.household_id
			 FROM accounts a
			 INNER JOIN kids k ON k.id = a.kid_id
			 WHERE a.id = ?`,
			[accountId],
		)
		if (!row) {
			throw new Error('Account not found.')
		}
		const household = await this.#ensureHousehold()
		const householdId = getNumber(row.household_id)
		if (householdId !== household.id) {
			throw new Error('Account does not belong to this household.')
		}
		return {
			id: getNumber(row.id),
			kidId: getNumber(row.kid_id),
			householdId,
			isArchived: getBoolean(row.is_archived),
		}
	}

	async #validateKidOrder(householdId: number, kidIds: Array<number>) {
		const rows = await this.#all(
			`SELECT id
			 FROM kids
			 WHERE household_id = ? AND is_archived = 0
			 ORDER BY id ASC`,
			[householdId],
		)
		const existingIds = rows.map((row) => getNumber(row.id))
		const sortedExisting = [...existingIds].sort((a, b) => a - b)
		const sortedProvided = [...kidIds].sort((a, b) => a - b)
		if (sortedExisting.length !== sortedProvided.length) {
			throw new Error('Reorder payload does not include all active kids.')
		}
		for (let index = 0; index < sortedExisting.length; index += 1) {
			if (sortedExisting[index] !== sortedProvided[index]) {
				throw new Error('Reorder payload contains invalid kid IDs.')
			}
		}
	}

	async #getAccountBalance(accountId: number) {
		const row = await this.#first(
			`SELECT COALESCE(SUM(amount_cents), 0) AS balance
			 FROM transactions
			 WHERE account_id = ?`,
			[accountId],
		)
		return getNumber(row?.balance ?? 0)
	}

	async #listKids(householdId: number, includeArchived: boolean) {
		const kidsRows = await this.#all(
			`SELECT id, household_id, name, emoji, sort_order, is_archived
			 FROM kids
			 WHERE household_id = ? ${includeArchived ? '' : 'AND is_archived = 0'}
			 ORDER BY sort_order ASC, id ASC`,
			[householdId],
		)
		const kids = kidsRows.map((kidRow) => ({
			id: getNumber(kidRow.id),
			householdId: getNumber(kidRow.household_id),
			name: getString(kidRow.name),
			emoji: getString(kidRow.emoji),
			sortOrder: getNumber(kidRow.sort_order),
			isArchived: getBoolean(kidRow.is_archived),
			totalBalanceCents: 0,
			accounts: [] as Array<LedgerAccount>,
		}))

		if (kids.length === 0) {
			return [] as Array<LedgerKid>
		}

		const kidIdList = kids.map((kid) => kid.id)
		const accountRows = await this.#all(
			`SELECT
				a.id,
				a.kid_id,
				a.name,
				a.color_token,
				a.sort_order,
				a.is_archived,
				COALESCE(SUM(t.amount_cents), 0) AS balance_cents
			 FROM accounts a
			 LEFT JOIN transactions t ON t.account_id = a.id
			 WHERE a.kid_id IN (${kidIdList.map(() => '?').join(',')})
			 ${includeArchived ? '' : 'AND a.is_archived = 0'}
			 GROUP BY a.id, a.kid_id, a.name, a.color_token, a.sort_order, a.is_archived
			 ORDER BY a.sort_order ASC, a.id ASC`,
			kidIdList,
		)
		const kidById = new Map<number, LedgerKid>()
		for (const kid of kids) {
			kidById.set(kid.id, kid)
		}
		for (const accountRow of accountRows) {
			const kidId = getNumber(accountRow.kid_id)
			const kid = kidById.get(kidId)
			if (!kid) continue
			const balanceCents = getNumber(accountRow.balance_cents)
			kid.accounts.push({
				id: getNumber(accountRow.id),
				kidId,
				name: getString(accountRow.name),
				colorToken: getString(accountRow.color_token),
				sortOrder: getNumber(accountRow.sort_order),
				isArchived: getBoolean(accountRow.is_archived),
				balanceCents,
			})
			kid.totalBalanceCents += balanceCents
		}
		return kids
	}

	async #all(statement: string, params: Array<unknown> = []) {
		const result = await this.#db
			.prepare(statement)
			.bind(...params)
			.all<QueryRow>()
		return result.results ?? []
	}

	async #first(statement: string, params: Array<unknown> = []) {
		const result = await this.#all(statement, params)
		return result[0] ?? null
	}

	async #run(statement: string, params: Array<unknown> = []) {
		return this.#db
			.prepare(statement)
			.bind(...params)
			.run<unknown>() as Promise<RunResult>
	}
}

export function createLedgerService(db: D1Database, userId: number) {
	return new LedgerService(db, userId)
}

function getNumber(value: unknown) {
	if (typeof value === 'number') return value
	if (typeof value === 'string' && value.trim()) {
		const numeric = Number(value)
		if (!Number.isNaN(numeric)) return numeric
	}
	return 0
}

function getString(value: unknown) {
	if (typeof value === 'string') return value
	if (value === null || value === undefined) return ''
	return String(value)
}

function getBoolean(value: unknown) {
	return getNumber(value) === 1
}
