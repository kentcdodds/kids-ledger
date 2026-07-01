import { createDatabase, sql, table } from 'remix/data-table'
import { number, string } from 'remix/data-schema'
import { createD1DataTableAdapter } from './d1-data-table-adapter.ts'

export const usersTable = table({
	name: 'users',
	columns: {
		id: number(),
		username: string(),
		email: string(),
		password_hash: string(),
		created_at: string(),
		updated_at: string(),
	},
	primaryKey: 'id',
})

export const passwordResetsTable = table({
	name: 'password_resets',
	columns: {
		id: number(),
		user_id: number(),
		token_hash: string(),
		expires_at: number(),
		created_at: string(),
	},
	primaryKey: 'id',
})

export const mockResendMessagesTable = table({
	name: 'mock_resend_messages',
	columns: {
		id: string(),
		token_hash: string(),
		received_at: number(),
		from_email: string(),
		to_json: string(),
		subject: string(),
		html: string(),
		payload_json: string(),
	},
	primaryKey: 'id',
})

export const householdsTable = table({
	name: 'households',
	columns: {
		id: number(),
		user_id: number(),
		name: string(),
		created_at: string(),
		updated_at: string(),
	},
	primaryKey: 'id',
})

export const kidsTable = table({
	name: 'kids',
	columns: {
		id: number(),
		household_id: number(),
		name: string(),
		emoji: string(),
		transaction_modal_css: string(),
		sort_order: number(),
		is_archived: number(),
		archived_at: string(),
		created_at: string(),
		updated_at: string(),
	},
	primaryKey: 'id',
})

export const accountsTable = table({
	name: 'accounts',
	columns: {
		id: number(),
		kid_id: number(),
		name: string(),
		apy_basis_points: number(),
		color_token: string(),
		sort_order: number(),
		is_archived: number(),
		archived_at: string(),
		created_at: string(),
		updated_at: string(),
	},
	primaryKey: 'id',
})

export const transactionsTable = table({
	name: 'transactions',
	columns: {
		id: number(),
		household_id: number(),
		kid_id: number(),
		account_id: number(),
		amount_cents: number(),
		note: string(),
		source_type: string(),
		source_period: string(),
		created_at: string(),
	},
	primaryKey: 'id',
})

export const interestAccrualsTable = table({
	name: 'interest_accruals',
	columns: {
		id: number(),
		account_id: number(),
		period: string(),
		balance_cents: number(),
		apy_basis_points: number(),
		amount_cents: number(),
		transaction_id: number(),
		created_at: string(),
		updated_at: string(),
	},
	primaryKey: 'id',
})

export const quickAmountPresetsTable = table({
	name: 'quick_amount_presets',
	columns: {
		id: number(),
		household_id: number(),
		amount_cents: number(),
		sort_order: number(),
		created_at: string(),
	},
	primaryKey: 'id',
})

export function createDb(db: D1Database) {
	return createDatabase(createD1DataTableAdapter(db))
}

export type AppDatabase = ReturnType<typeof createDb>
export { sql }
