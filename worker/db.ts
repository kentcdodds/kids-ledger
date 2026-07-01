import { column as c, createDatabase, sql, table } from 'remix/data-table'
import { createD1DataTableAdapter } from './d1-data-table-adapter.ts'

export const usersTable = table({
	name: 'users',
	columns: {
		id: c.integer(),
		username: c.text(),
		email: c.text(),
		password_hash: c.text(),
		created_at: c.text(),
		updated_at: c.text(),
	},
	primaryKey: 'id',
})

export const passwordResetsTable = table({
	name: 'password_resets',
	columns: {
		id: c.integer(),
		user_id: c.integer(),
		token_hash: c.text(),
		expires_at: c.integer(),
		created_at: c.text(),
	},
	primaryKey: 'id',
})

export const mockResendMessagesTable = table({
	name: 'mock_resend_messages',
	columns: {
		id: c.text(),
		token_hash: c.text(),
		received_at: c.integer(),
		from_email: c.text(),
		to_json: c.text(),
		subject: c.text(),
		html: c.text(),
		payload_json: c.text(),
	},
	primaryKey: 'id',
})

export const householdsTable = table({
	name: 'households',
	columns: {
		id: c.integer(),
		user_id: c.integer(),
		name: c.text(),
		created_at: c.text(),
		updated_at: c.text(),
	},
	primaryKey: 'id',
})

export const kidsTable = table({
	name: 'kids',
	columns: {
		id: c.integer(),
		household_id: c.integer(),
		name: c.text(),
		emoji: c.text(),
		transaction_modal_css: c.text(),
		sort_order: c.integer(),
		is_archived: c.integer(),
		archived_at: c.text(),
		created_at: c.text(),
		updated_at: c.text(),
	},
	primaryKey: 'id',
})

export const accountsTable = table({
	name: 'accounts',
	columns: {
		id: c.integer(),
		kid_id: c.integer(),
		name: c.text(),
		apy_basis_points: c.integer(),
		color_token: c.text(),
		sort_order: c.integer(),
		is_archived: c.integer(),
		archived_at: c.text(),
		created_at: c.text(),
		updated_at: c.text(),
	},
	primaryKey: 'id',
})

export const transactionsTable = table({
	name: 'transactions',
	columns: {
		id: c.integer(),
		household_id: c.integer(),
		kid_id: c.integer(),
		account_id: c.integer(),
		amount_cents: c.integer(),
		note: c.text(),
		source_type: c.text(),
		source_period: c.text(),
		created_at: c.text(),
	},
	primaryKey: 'id',
})

export const interestAccrualsTable = table({
	name: 'interest_accruals',
	columns: {
		id: c.integer(),
		account_id: c.integer(),
		period: c.text(),
		balance_cents: c.integer(),
		apy_basis_points: c.integer(),
		amount_cents: c.integer(),
		transaction_id: c.integer(),
		created_at: c.text(),
		updated_at: c.text(),
	},
	primaryKey: 'id',
})

export const quickAmountPresetsTable = table({
	name: 'quick_amount_presets',
	columns: {
		id: c.integer(),
		household_id: c.integer(),
		amount_cents: c.integer(),
		sort_order: c.integer(),
		created_at: c.text(),
	},
	primaryKey: 'id',
})

export function createDb(db: D1Database) {
	return createDatabase(createD1DataTableAdapter(db))
}

export type AppDatabase = ReturnType<typeof createDb>
export { sql }
