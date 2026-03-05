import { z } from 'zod'
import { type MCP } from '#mcp/index.ts'
import {
	createLedgerServiceForAgent,
	successContent,
} from '#mcp/tools/ledger-tool-helpers.ts'
import {
	transactionModalCssCreateFieldDescription,
	transactionModalCssUpdateFieldDescription,
} from '#shared/transaction-modal-css.ts'

export async function registerLedgerTools(agent: MCP) {
	agent.server.registerTool(
		'ledger_get_dashboard',
		{
			title: 'Ledger Dashboard',
			description: 'Get active kids, accounts, balances, and quick amounts.',
			inputSchema: {},
		},
		async () => {
			const service = await createLedgerServiceForAgent(agent)
			const dashboard = await service.getDashboard()
			return {
				...successContent(
					'Ledger dashboard',
					`Loaded ${dashboard.kids.length} kids and family total ${dashboard.familyBalanceCents} cents.`,
				),
				structuredContent: dashboard,
			}
		},
	)

	agent.server.registerTool(
		'ledger_create_kid',
		{
			title: 'Create Kid',
			description:
				'Create a kid profile with optional transaction modal CSS customization.',
			inputSchema: {
				name: z.string().min(1),
				emoji: z.string().min(1).default('🧒'),
				transactionModalCss: z
					.string()
					.optional()
					.describe(transactionModalCssCreateFieldDescription),
			},
		},
		async ({
			name,
			emoji,
			transactionModalCss,
		}: {
			name: string
			emoji: string
			transactionModalCss?: string
		}) => {
			const service = await createLedgerServiceForAgent(agent)
			const created = await service.createKid({ name, emoji, transactionModalCss })
			return {
				...successContent('Kid created', `Created kid with id ${created.id}.`),
				structuredContent: created,
			}
		},
	)

	agent.server.registerTool(
		'ledger_update_kid',
		{
			title: 'Update Kid',
			description: 'Update a kid name, emoji, or transaction modal CSS.',
			inputSchema: {
				kidId: z.number().int().positive(),
				name: z.string().min(1),
				emoji: z.string().min(1),
				transactionModalCss: z
					.string()
					.optional()
					.describe(transactionModalCssUpdateFieldDescription),
			},
		},
		async ({
			kidId,
			name,
			emoji,
			transactionModalCss,
		}: {
			kidId: number
			name: string
			emoji: string
			transactionModalCss?: string
		}) => {
			const service = await createLedgerServiceForAgent(agent)
			await service.updateKid({ kidId, name, emoji, transactionModalCss })
			return successContent('Kid updated', `Updated kid ${kidId}.`)
		},
	)

	agent.server.registerTool(
		'ledger_reorder_kids',
		{
			title: 'Reorder Kids',
			description: 'Set active kid order by id list.',
			inputSchema: {
				kidIds: z.array(z.number().int().positive()).min(1),
			},
		},
		async ({ kidIds }: { kidIds: Array<number> }) => {
			const service = await createLedgerServiceForAgent(agent)
			await service.reorderKids(kidIds)
			return successContent('Kids reordered', 'Updated kid ordering.')
		},
	)

	agent.server.registerTool(
		'ledger_archive_kid',
		{
			title: 'Archive Kid',
			description: 'Archive a kid.',
			inputSchema: { kidId: z.number().int().positive() },
		},
		async ({ kidId }: { kidId: number }) => {
			const service = await createLedgerServiceForAgent(agent)
			await service.archiveKid(kidId)
			return successContent('Kid archived', `Archived kid ${kidId}.`)
		},
	)

	agent.server.registerTool(
		'ledger_delete_kid',
		{
			title: 'Delete Kid Permanently',
			description: 'Permanently delete an archived kid.',
			inputSchema: { kidId: z.number().int().positive() },
		},
		async ({ kidId }: { kidId: number }) => {
			const service = await createLedgerServiceForAgent(agent)
			await service.deleteKidPermanently(kidId)
			return successContent('Kid deleted', `Deleted kid ${kidId}.`)
		},
	)

	agent.server.registerTool(
		'ledger_create_account',
		{
			title: 'Create Account',
			description: 'Create an account under a kid.',
			inputSchema: {
				kidId: z.number().int().positive(),
				name: z.string().min(1),
				colorToken: z.string().min(1).default('orchid'),
			},
		},
		async ({
			kidId,
			name,
			colorToken,
		}: {
			kidId: number
			name: string
			colorToken: string
		}) => {
			const service = await createLedgerServiceForAgent(agent)
			const created = await service.createAccount({ kidId, name, colorToken })
			return {
				...successContent('Account created', `Created account ${created.id}.`),
				structuredContent: created,
			}
		},
	)

	agent.server.registerTool(
		'ledger_update_account',
		{
			title: 'Update Account',
			description: 'Update an account name or color.',
			inputSchema: {
				accountId: z.number().int().positive(),
				name: z.string().min(1),
				colorToken: z.string().min(1),
			},
		},
		async ({
			accountId,
			name,
			colorToken,
		}: {
			accountId: number
			name: string
			colorToken: string
		}) => {
			const service = await createLedgerServiceForAgent(agent)
			await service.updateAccount({ accountId, name, colorToken })
			return successContent('Account updated', `Updated account ${accountId}.`)
		},
	)

	agent.server.registerTool(
		'ledger_reorder_accounts',
		{
			title: 'Reorder Accounts',
			description: 'Set account order within a kid by id list.',
			inputSchema: {
				kidId: z.number().int().positive(),
				accountIds: z.array(z.number().int().positive()).min(1),
			},
		},
		async ({
			kidId,
			accountIds,
		}: {
			kidId: number
			accountIds: Array<number>
		}) => {
			const service = await createLedgerServiceForAgent(agent)
			await service.reorderAccounts({ kidId, accountIds })
			return successContent(
				'Accounts reordered',
				`Updated accounts for kid ${kidId}.`,
			)
		},
	)

	agent.server.registerTool(
		'ledger_archive_account',
		{
			title: 'Archive Account',
			description: 'Archive an account.',
			inputSchema: { accountId: z.number().int().positive() },
		},
		async ({ accountId }: { accountId: number }) => {
			const service = await createLedgerServiceForAgent(agent)
			await service.archiveAccount(accountId)
			return successContent(
				'Account archived',
				`Archived account ${accountId}.`,
			)
		},
	)

	agent.server.registerTool(
		'ledger_delete_account',
		{
			title: 'Delete Account Permanently',
			description: 'Permanently delete an archived account.',
			inputSchema: { accountId: z.number().int().positive() },
		},
		async ({ accountId }: { accountId: number }) => {
			const service = await createLedgerServiceForAgent(agent)
			await service.deleteAccountPermanently(accountId)
			return successContent('Account deleted', `Deleted account ${accountId}.`)
		},
	)

	agent.server.registerTool(
		'ledger_add_transaction',
		{
			title: 'Add Transaction',
			description:
				'Append a transaction to an account. Use positive cents for add, negative cents for remove.',
			inputSchema: {
				accountId: z.number().int().positive(),
				amountCents: z.number().int(),
				note: z.string().optional(),
			},
		},
		async ({
			accountId,
			amountCents,
			note,
		}: {
			accountId: number
			amountCents: number
			note?: string
		}) => {
			const service = await createLedgerServiceForAgent(agent)
			const result = await service.addTransaction({
				accountId,
				amountCents,
				note,
			})
			return {
				...successContent('Transaction added', `Account ${accountId} updated.`),
				structuredContent: result,
			}
		},
	)

	agent.server.registerTool(
		'ledger_list_transactions',
		{
			title: 'List Transactions',
			description: 'List recent transactions with optional filters.',
			inputSchema: {
				kidId: z.number().int().positive().optional(),
				accountId: z.number().int().positive().optional(),
				type: z.enum(['add', 'remove']).optional(),
				from: z.string().optional(),
				to: z.string().optional(),
				minAmountCents: z.number().int().min(0).optional(),
				maxAmountCents: z.number().int().min(0).optional(),
				page: z.number().int().positive().optional(),
				limit: z.number().int().positive().max(50).optional(),
				offset: z.number().int().min(0).optional(),
			},
		},
		async ({
			kidId,
			accountId,
			type,
			from,
			to,
			minAmountCents,
			maxAmountCents,
			page,
			limit,
			offset,
		}: {
			kidId?: number
			accountId?: number
			type?: 'add' | 'remove'
			from?: string
			to?: string
			minAmountCents?: number
			maxAmountCents?: number
			page?: number
			limit?: number
			offset?: number
		}) => {
			const service = await createLedgerServiceForAgent(agent)
			const result = await service.listTransactions({
				kidId,
				accountId,
				type,
				from,
				to,
				minAmountCents,
				maxAmountCents,
				page,
				limit,
				offset,
			})
			return {
				...successContent(
					'Transactions loaded',
					`Loaded ${result.transactions.length} rows.`,
				),
				structuredContent: result,
			}
		},
	)

	agent.server.registerTool(
		'ledger_set_quick_amounts',
		{
			title: 'Set Quick Amounts',
			description: 'Replace quick amount presets using cents values.',
			inputSchema: {
				amounts: z.array(z.number().int().positive()).min(1).max(12),
			},
		},
		async ({ amounts }: { amounts: Array<number> }) => {
			const service = await createLedgerServiceForAgent(agent)
			await service.setQuickAmounts(amounts)
			const quickAmounts = await service.listQuickAmounts()
			return {
				...successContent('Quick amounts updated', 'Preset amounts saved.'),
				structuredContent: { quickAmounts },
			}
		},
	)

	agent.server.registerTool(
		'ledger_export_json',
		{
			title: 'Export Ledger JSON',
			description: 'Return JSON export payload for backup.',
			inputSchema: {},
		},
		async () => {
			const service = await createLedgerServiceForAgent(agent)
			const payload = await service.exportLedgerData()
			return {
				...successContent(
					'Export ready',
					'Generated full ledger JSON export payload.',
				),
				structuredContent: payload,
			}
		},
	)
}
