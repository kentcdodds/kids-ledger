import { z } from 'zod'

// Helper to transform timestamps from SQLite's datetime format
const timestampSchema = z.preprocess((val) => {
	if (typeof val === 'string') {
		// SQLite datetime format: YYYY-MM-DD HH:MM:SS
		const date = new Date(val.replace(' ', 'T'))
		const timestamp = date.getTime() / 1000
		return isNaN(timestamp) ? null : timestamp
	}
	return val
}, z.number())

// Ledger schemas
export const ledgerSchema = z.object({
	id: z.string(),
	name: z.string(),
	createdAt: timestampSchema,
	updatedAt: timestampSchema,
})

export const newLedgerSchema = z.object({
	name: z.string(),
})

// Kid schemas
export const kidSchema = z.object({
	id: z.coerce.number(),
	ledgerId: z.string(),
	name: z.string(),
	emoji: z.string(),
	createdAt: timestampSchema,
	updatedAt: timestampSchema,
})

export const newKidSchema = z.object({
	ledgerId: z.string(),
	name: z.string(),
	emoji: z.string(),
})

// Account schemas
export const accountSchema = z.object({
	id: z.coerce.number(),
	kidId: z.coerce.number(),
	name: z.string(),
	balance: z.coerce.number(),
	createdAt: timestampSchema,
	updatedAt: timestampSchema,
})

export const newAccountSchema = z.object({
	kidId: z.number(),
	name: z.string(),
	balance: z.number().optional().default(0),
})

export const updateAccountBalanceSchema = z.object({
	id: z.number(),
	balance: z.number(),
})

// Input schemas for API
export const createLedgerInputSchema = {
	name: z.string().describe('The name of the ledger'),
}

export const createKidInputSchema = {
	ledgerId: z.string().describe('The ID of the ledger'),
	name: z.string().describe('The name of the kid'),
	emoji: z.string().describe('The emoji avatar for the kid'),
}

export const createAccountInputSchema = {
	kidId: z.number().describe('The ID of the kid'),
	name: z.string().describe('The name of the account'),
	balance: z.number().optional().default(0).describe('The initial balance of the account'),
}

export const updateAccountBalanceInputSchema = {
	id: z.number().describe('The ID of the account'),
	balance: z.number().describe('The new balance of the account'),
}

// Export types
export type Ledger = z.infer<typeof ledgerSchema>
export type NewLedger = z.infer<typeof newLedgerSchema>
export type Kid = z.infer<typeof kidSchema>
export type NewKid = z.infer<typeof newKidSchema>
export type Account = z.infer<typeof accountSchema>
export type NewAccount = z.infer<typeof newAccountSchema>
