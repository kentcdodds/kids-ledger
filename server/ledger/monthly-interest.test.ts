import { expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createLedgerService } from './ledger-service.ts'
import { runMonthlyInterest } from './monthly-interest.ts'
import {
	calculateMonthlyInterestCents,
	getMonthlyInterestPeriodStart,
	monthlyInterestSourceType,
	monthlyInterestTransactionNote,
} from '#shared/ledger-interest.ts'

const projectRoot = fileURLToPath(new URL('../..', import.meta.url))
const migrationsDir = join(projectRoot, 'migrations')

class SqliteD1PreparedStatement {
	#database: Database
	#query: string
	#params: Array<unknown>

	constructor(database: Database, query: string, params: Array<unknown> = []) {
		this.#database = database
		this.#query = query
		this.#params = params
	}

	bind(...values: Array<unknown>) {
		return new SqliteD1PreparedStatement(this.#database, this.#query, values)
	}

	async all<T = Record<string, unknown>>() {
		const statement = this.#database.query(this.#query)
		const results = statement.all(...this.#params) as Array<T>
		return {
			results,
			success: true,
			meta: { changes: 0, last_row_id: 0 },
		}
	}

	async first<T = Record<string, unknown>>(columnName?: string) {
		const statement = this.#database.query(this.#query)
		const row = statement.get(...this.#params) as Record<string, unknown> | null
		if (!row) return null
		if (columnName) return row[columnName] as T
		return row as T
	}

	async run<T = unknown>() {
		const statement = this.#database.query(this.#query)
		const result = statement.run(...this.#params)
		return {
			results: [] as Array<T>,
			success: true,
			meta: {
				changes: result.changes,
				last_row_id: Number(result.lastInsertRowid),
			},
		}
	}
}

class SqliteD1Database {
	#database: Database

	constructor(database: Database) {
		this.#database = database
	}

	prepare(query: string) {
		return new SqliteD1PreparedStatement(this.#database, query)
	}

	async exec(query: string) {
		this.#database.exec(query)
		return { count: 0, duration: 0 }
	}
}

async function createTestDatabase() {
	const sqlite = new Database(':memory:')
	sqlite.exec('PRAGMA foreign_keys = ON')
	const db = new SqliteD1Database(sqlite) as unknown as D1Database
	await applyMigrations(sqlite)
	return {
		db,
		sqlite,
		[Symbol.dispose]() {
			sqlite.close()
		},
	}
}

async function applyMigrations(sqlite: Database) {
	const migrationFiles = (await readdir(migrationsDir))
		.filter((entry) => entry.endsWith('.sql'))
		.sort((left, right) => left.localeCompare(right))
	for (const migrationFile of migrationFiles) {
		sqlite.exec(await readFile(join(migrationsDir, migrationFile), 'utf8'))
	}
}

function createLedgerFixture(sqlite: Database) {
	sqlite
		.query(
			`INSERT INTO users (username, email, password_hash)
			 VALUES (?, ?, ?)`,
		)
		.run('parent', 'parent@example.com', 'hash')
	const userId = Number(sqlite.query('SELECT id FROM users').get().id)
	sqlite
		.query(`INSERT INTO households (user_id, name) VALUES (?, ?)`)
		.run(userId, 'Test Household')
	const householdId = Number(sqlite.query('SELECT id FROM households').get().id)
	sqlite
		.query(
			`INSERT INTO kids (household_id, name, emoji, sort_order)
			 VALUES (?, ?, ?, ?)`,
		)
		.run(householdId, 'Avery', ':)', 0)
	const kidId = Number(sqlite.query('SELECT id FROM kids').get().id)
	return { householdId, kidId, userId }
}

function createAccount(
	sqlite: Database,
	input: {
		kidId: number
		name: string
		apyBasisPoints?: number
		balanceCents: number
		createdAt?: string
	},
) {
	sqlite
		.query(
			`INSERT INTO accounts (kid_id, name, apy_basis_points, color_token, sort_order)
			 VALUES (?, ?, ?, ?, ?)`,
		)
		.run(input.kidId, input.name, input.apyBasisPoints ?? 0, 'orchid', 0)
	const accountId = Number(
		sqlite.query('SELECT id FROM accounts ORDER BY id DESC LIMIT 1').get().id,
	)
	if (input.balanceCents !== 0) {
		sqlite
			.query(
				`INSERT INTO transactions (household_id, kid_id, account_id, amount_cents, note, created_at)
				 SELECT k.household_id, k.id, ?, ?, ?, ?
				 FROM kids k
				 WHERE k.id = ?`,
			)
			.run(
				accountId,
				input.balanceCents,
				'Initial balance',
				input.createdAt ?? '2026-04-30 23:59:59',
				input.kidId,
			)
	}
	return accountId
}

function listInterestTransactions(sqlite: Database) {
	return sqlite
		.query(
			`SELECT account_id, amount_cents, note, source_type, source_period, created_at
			 FROM transactions
			 WHERE source_type = ?
			 ORDER BY account_id ASC`,
		)
		.all(monthlyInterestSourceType) as Array<Record<string, unknown>>
}

test('monthly interest calculation uses APY monthly compounding rates', () => {
	expect(
		calculateMonthlyInterestCents({
			balanceCents: 3_000,
			apyBasisPoints: 1_200,
		}),
	).toBe(28)
	expect(
		calculateMonthlyInterestCents({
			balanceCents: 3_000,
			apyBasisPoints: 2_400,
		}),
	).toBe(54)
})

test('monthly interest period start rejects invalid month values', () => {
	expect(() => getMonthlyInterestPeriodStart('2026-00')).toThrow(
		'Interest period month must be between 01 and 12.',
	)
	expect(() => getMonthlyInterestPeriodStart('2026-13')).toThrow(
		'Interest period month must be between 01 and 12.',
	)
	expect(getMonthlyInterestPeriodStart('2026-12')).toBe('2026-12-01 00:00:00')
})

test('monthly interest creates auditable ledger transactions using per-account APY rates', async () => {
	using database = await createTestDatabase()
	const { kidId } = createLedgerFixture(database.sqlite)
	const spendingAccountId = createAccount(database.sqlite, {
		kidId,
		name: 'Spending',
		apyBasisPoints: 1_200,
		balanceCents: 3_000,
	})
	const savingsAccountId = createAccount(database.sqlite, {
		kidId,
		name: 'Savings',
		apyBasisPoints: 2_400,
		balanceCents: 3_000,
	})

	const result = await runMonthlyInterest(database.db, {
		runAt: new Date('2026-05-01T00:00:00.000Z'),
	})

	expect(result).toMatchObject({
		period: '2026-05',
		checkedAccounts: 2,
		recordedAccruals: 2,
		createdTransactions: 2,
	})
	expect(listInterestTransactions(database.sqlite)).toEqual([
		{
			account_id: spendingAccountId,
			amount_cents: 28,
			note: monthlyInterestTransactionNote,
			source_type: monthlyInterestSourceType,
			source_period: '2026-05',
			created_at: '2026-05-01 00:00:00',
		},
		{
			account_id: savingsAccountId,
			amount_cents: 54,
			note: monthlyInterestTransactionNote,
			source_type: monthlyInterestSourceType,
			source_period: '2026-05',
			created_at: '2026-05-01 00:00:00',
		},
	])
})

test('monthly interest is idempotent per account and period', async () => {
	using database = await createTestDatabase()
	const { kidId } = createLedgerFixture(database.sqlite)
	const accountId = createAccount(database.sqlite, {
		kidId,
		name: 'Savings',
		apyBasisPoints: 2_400,
		balanceCents: 3_000,
	})

	await runMonthlyInterest(database.db, { period: '2026-05' })
	database.sqlite
		.query(
			`INSERT INTO transactions (household_id, kid_id, account_id, amount_cents, note)
			 SELECT k.household_id, k.id, ?, ?, ?
			 FROM kids k
			 WHERE k.id = ?`,
		)
		.run(accountId, 10_000, 'Post-payout deposit', kidId)
	const rerunResult = await runMonthlyInterest(database.db, {
		period: '2026-05',
	})

	expect(rerunResult).toMatchObject({
		checkedAccounts: 1,
		recordedAccruals: 0,
		createdTransactions: 0,
		skippedExistingAccruals: 1,
	})
	expect(listInterestTransactions(database.sqlite)).toHaveLength(1)
	expect(
		database.sqlite
			.query(
				`SELECT COUNT(*) AS count
				 FROM interest_accruals
				 WHERE account_id = ? AND period = ?`,
			)
			.get(accountId, '2026-05'),
	).toEqual({ count: 1 })
})

test('monthly interest uses the period-start balance snapshot', async () => {
	using database = await createTestDatabase()
	const { kidId } = createLedgerFixture(database.sqlite)
	const accountId = createAccount(database.sqlite, {
		kidId,
		name: 'Custom Rate',
		apyBasisPoints: 1_200,
		balanceCents: 3_000,
	})
	database.sqlite
		.query(
			`INSERT INTO transactions (household_id, kid_id, account_id, amount_cents, note, created_at)
			 SELECT k.household_id, k.id, ?, ?, ?, ?
			 FROM kids k
			 WHERE k.id = ?`,
		)
		.run(accountId, 10_000, 'After period start', '2026-05-01 00:00:00', kidId)

	await runMonthlyInterest(database.db, { period: '2026-05' })

	expect(listInterestTransactions(database.sqlite)).toEqual([
		{
			account_id: accountId,
			amount_cents: 28,
			note: monthlyInterestTransactionNote,
			source_type: monthlyInterestSourceType,
			source_period: '2026-05',
			created_at: '2026-05-01 00:00:00',
		},
	])
	expect(
		database.sqlite
			.query(
				`SELECT balance_cents
				 FROM interest_accruals
				 WHERE account_id = ? AND period = ?`,
			)
			.get(accountId, '2026-05'),
	).toEqual({ balance_cents: 3_000 })
})

test('ledger service rejects invalid APY basis points', async () => {
	using database = await createTestDatabase()
	const { kidId, userId } = createLedgerFixture(database.sqlite)
	const service = createLedgerService(database.db, userId)
	const accountId = createAccount(database.sqlite, {
		kidId,
		name: 'Custom Rate',
		apyBasisPoints: 1_200,
		balanceCents: 3_000,
	})

	await expect(
		service.createAccount({
			kidId,
			name: 'Bad APY',
			apyBasisPoints: -1,
			colorToken: 'orchid',
		}),
	).rejects.toThrow('apyBasisPoints must be between 0 and 100000.')
	await expect(
		service.updateAccount({
			accountId,
			name: 'Too High APY',
			apyBasisPoints: 100_001,
			colorToken: 'orchid',
		}),
	).rejects.toThrow('apyBasisPoints must be between 0 and 100000.')
})

test('monthly interest records zero accruals so later reruns do not pay after the start-of-month snapshot', async () => {
	using database = await createTestDatabase()
	const { kidId } = createLedgerFixture(database.sqlite)
	const accountId = createAccount(database.sqlite, {
		kidId,
		name: 'Spending',
		apyBasisPoints: 1_200,
		balanceCents: 0,
	})

	await runMonthlyInterest(database.db, { period: '2026-06' })
	database.sqlite
		.query(
			`INSERT INTO transactions (household_id, kid_id, account_id, amount_cents, note)
			 SELECT k.household_id, k.id, ?, ?, ?
			 FROM kids k
			 WHERE k.id = ?`,
		)
		.run(accountId, 30_000, 'After snapshot', kidId)
	await runMonthlyInterest(database.db, { period: '2026-06' })

	expect(listInterestTransactions(database.sqlite)).toHaveLength(0)
	expect(
		database.sqlite
			.query(
				`SELECT balance_cents, amount_cents
				 FROM interest_accruals
				 WHERE account_id = ? AND period = ?`,
			)
			.get(accountId, '2026-06'),
	).toEqual({ balance_cents: 0, amount_cents: 0 })
})

test('new accounts default to zero APY regardless of account name', async () => {
	using database = await createTestDatabase()
	const { kidId } = createLedgerFixture(database.sqlite)
	const accountId = createAccount(database.sqlite, {
		kidId,
		name: 'Savings',
		balanceCents: 3_000,
	})

	const result = await runMonthlyInterest(database.db, { period: '2026-07' })

	expect(result).toMatchObject({
		checkedAccounts: 1,
		recordedAccruals: 1,
		createdTransactions: 0,
		skippedZeroInterest: 1,
	})
	expect(listInterestTransactions(database.sqlite)).toHaveLength(0)
	expect(
		database.sqlite
			.query(
				`SELECT apy_basis_points, amount_cents
				 FROM interest_accruals
				 WHERE account_id = ? AND period = ?`,
			)
			.get(accountId, '2026-07'),
	).toEqual({ apy_basis_points: 0, amount_cents: 0 })
})
