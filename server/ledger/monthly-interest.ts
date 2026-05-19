import {
	calculateMonthlyInterestCents,
	getMonthlyInterestPeriod,
	getMonthlyInterestPeriodStart,
	monthlyInterestSourceType,
	monthlyInterestTransactionNote,
} from '#shared/ledger-interest.ts'

type QueryRow = Record<string, unknown>

type EligibleAccount = {
	id: number
	householdId: number
	kidId: number
	apyBasisPoints: number
	balanceCents: number
}

type InterestAccrual = {
	id: number
	accountId: number
	period: string
	amountCents: number
	transactionId: number | null
}

export type MonthlyInterestRunResult = {
	period: string
	checkedAccounts: number
	recordedAccruals: number
	createdTransactions: number
	skippedExistingAccruals: number
	skippedZeroInterest: number
}

export async function runMonthlyInterest(
	db: D1Database,
	input: { runAt?: Date; period?: string } = {},
): Promise<MonthlyInterestRunResult> {
	const runAt = input.runAt ?? new Date()
	const period = input.period ?? getMonthlyInterestPeriod(runAt)
	const createdAt = getMonthlyInterestPeriodStart(period)
	const accounts = await listEligibleAccounts(db, createdAt)
	const result: MonthlyInterestRunResult = {
		period,
		checkedAccounts: accounts.length,
		recordedAccruals: 0,
		createdTransactions: 0,
		skippedExistingAccruals: 0,
		skippedZeroInterest: 0,
	}

	for (const account of accounts) {
		const amountCents = calculateMonthlyInterestCents({
			balanceCents: account.balanceCents,
			apyBasisPoints: account.apyBasisPoints,
		})
		const insertedAccrual = await insertInterestAccrual(db, {
			accountId: account.id,
			period,
			balanceCents: account.balanceCents,
			apyBasisPoints: account.apyBasisPoints,
			amountCents,
		})
		if (insertedAccrual) {
			result.recordedAccruals += 1
		} else {
			result.skippedExistingAccruals += 1
		}

		const accrual = await getInterestAccrual(db, account.id, period)
		if (!accrual) {
			throw new Error('Could not read monthly interest accrual.')
		}
		if (accrual.amountCents <= 0) {
			result.skippedZeroInterest += 1
			continue
		}
		if (accrual.transactionId !== null) continue

		const insertedTransaction = await insertInterestTransaction(db, {
			account,
			amountCents: accrual.amountCents,
			period,
			createdAt,
		})
		const transaction = await getInterestTransaction(db, account.id, period)
		if (!transaction) {
			throw new Error('Could not create monthly interest transaction.')
		}
		await linkInterestAccrual(db, accrual.id, getNumber(transaction.id))
		if (insertedTransaction) {
			result.createdTransactions += 1
		}
	}

	return result
}

async function listEligibleAccounts(db: D1Database, periodStart: string) {
	const rows = await all(
		db,
		`SELECT
			a.id,
			a.kid_id,
			a.apy_basis_points,
			k.household_id,
			COALESCE(SUM(t.amount_cents), 0) AS balance_cents
		 FROM accounts a
		 INNER JOIN kids k ON k.id = a.kid_id
		 LEFT JOIN transactions t
		 ON t.account_id = a.id
		 AND t.created_at < ?
		 WHERE a.is_archived = 0
		 AND k.is_archived = 0
		 GROUP BY a.id, a.kid_id, a.apy_basis_points, k.household_id
		 ORDER BY a.id ASC`,
		[periodStart],
	)
	return rows.map((row) => {
		return {
			id: getNumber(row.id),
			householdId: getNumber(row.household_id),
			kidId: getNumber(row.kid_id),
			apyBasisPoints: getNumber(row.apy_basis_points),
			balanceCents: getNumber(row.balance_cents),
		} satisfies EligibleAccount
	})
}

async function insertInterestAccrual(
	db: D1Database,
	input: {
		accountId: number
		period: string
		balanceCents: number
		apyBasisPoints: number
		amountCents: number
	},
) {
	const result = await run(
		db,
		`INSERT OR IGNORE INTO interest_accruals (
			account_id,
			period,
			balance_cents,
			apy_basis_points,
			amount_cents
		 )
		 VALUES (?, ?, ?, ?, ?)`,
		[
			input.accountId,
			input.period,
			input.balanceCents,
			input.apyBasisPoints,
			input.amountCents,
		],
	)
	return getChanges(result) > 0
}

async function getInterestAccrual(
	db: D1Database,
	accountId: number,
	period: string,
) {
	const row = await first(
		db,
		`SELECT id, account_id, period, amount_cents, transaction_id
		 FROM interest_accruals
		 WHERE account_id = ? AND period = ?`,
		[accountId, period],
	)
	if (!row) return null
	return {
		id: getNumber(row.id),
		accountId: getNumber(row.account_id),
		period: getString(row.period),
		amountCents: getNumber(row.amount_cents),
		transactionId:
			row.transaction_id === null ? null : getNumber(row.transaction_id),
	} satisfies InterestAccrual
}

async function insertInterestTransaction(
	db: D1Database,
	input: {
		account: EligibleAccount
		amountCents: number
		period: string
		createdAt: string
	},
) {
	const result = await run(
		db,
		`INSERT OR IGNORE INTO transactions (
			household_id,
			kid_id,
			account_id,
			amount_cents,
			note,
			source_type,
			source_period,
			created_at
		 )
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			input.account.householdId,
			input.account.kidId,
			input.account.id,
			input.amountCents,
			monthlyInterestTransactionNote,
			monthlyInterestSourceType,
			input.period,
			input.createdAt,
		],
	)
	return getChanges(result) > 0
}

async function getInterestTransaction(
	db: D1Database,
	accountId: number,
	period: string,
) {
	return first(
		db,
		`SELECT id
		 FROM transactions
		 WHERE account_id = ?
		 AND source_type = ?
		 AND source_period = ?`,
		[accountId, monthlyInterestSourceType, period],
	)
}

async function linkInterestAccrual(
	db: D1Database,
	accrualId: number,
	transactionId: number,
) {
	await run(
		db,
		`UPDATE interest_accruals
		 SET transaction_id = ?, updated_at = CURRENT_TIMESTAMP
		 WHERE id = ?`,
		[transactionId, accrualId],
	)
}

async function all(
	db: D1Database,
	statement: string,
	params: Array<unknown> = [],
) {
	const result = await db
		.prepare(statement)
		.bind(...params)
		.all<QueryRow>()
	return result.results ?? []
}

async function first(
	db: D1Database,
	statement: string,
	params: Array<unknown> = [],
) {
	const result = await all(db, statement, params)
	return result[0] ?? null
}

async function run(
	db: D1Database,
	statement: string,
	params: Array<unknown> = [],
) {
	return db
		.prepare(statement)
		.bind(...params)
		.run<unknown>()
}

function getChanges(result: D1Result<unknown>) {
	return typeof result.meta?.changes === 'number' ? result.meta.changes : 0
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
