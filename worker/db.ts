import { createDatabase, createTable, sql } from 'remix/data-table'
import { number, string } from 'remix/data-schema'
import { createD1DataTableAdapter } from './d1-data-table-adapter.ts'

export const usersTable = createTable({
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

export const passwordResetsTable = createTable({
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

export const mockResendMessagesTable = createTable({
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

export const householdsTable = createTable({
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

export const kidsTable = createTable({
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

export const accountsTable = createTable({
	name: 'accounts',
	columns: {
		id: number(),
		kid_id: number(),
		name: string(),
		color_token: string(),
		sort_order: number(),
		is_archived: number(),
		archived_at: string(),
		created_at: string(),
		updated_at: string(),
	},
	primaryKey: 'id',
})

export const transactionsTable = createTable({
	name: 'transactions',
	columns: {
		id: number(),
		household_id: number(),
		kid_id: number(),
		account_id: number(),
		amount_cents: number(),
		note: string(),
		created_at: string(),
	},
	primaryKey: 'id',
})

export const quickAmountPresetsTable = createTable({
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
