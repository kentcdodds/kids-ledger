import { type Action } from 'remix/fetch-router'
import {
	array,
	number,
	object,
	optional,
	string,
	type Schema,
} from 'remix/data-schema'
import {
	jsonResponse,
	parseJsonBody,
	readLedgerService,
} from '#server/ledger/ledger-request.ts'
import { type routes } from '#server/routes.ts'
import { type AppEnv } from '#types/env-schema.ts'
import { type LedgerService } from '#server/ledger/ledger-service.ts'

const createKidSchema = object({
	name: string(),
	emoji: string(),
	transactionModalCss: optional(string()),
})

const updateKidSchema = object({
	kidId: number(),
	name: string(),
	emoji: string(),
	transactionModalCss: optional(string()),
})

const reorderKidsSchema = object({
	kidIds: array(number()),
})

const kidIdSchema = object({
	kidId: number(),
})

const createAccountSchema = object({
	kidId: number(),
	name: string(),
	apyBasisPoints: optional(number()),
	colorToken: string(),
})

const updateAccountSchema = object({
	accountId: number(),
	name: string(),
	apyBasisPoints: optional(number()),
	colorToken: string(),
})

const reorderAccountsSchema = object({
	kidId: number(),
	accountIds: array(number()),
})

const accountIdSchema = object({
	accountId: number(),
})

const createTransactionSchema = object({
	accountId: number(),
	amountCents: number(),
	note: optional(string()),
})

const createTransferSchema = object({
	fromAccountId: number(),
	toAccountId: number(),
	amountCents: number(),
	note: optional(string()),
})

const setQuickAmountsSchema = object({
	amounts: array(number()),
})

function getNumberQueryParam(url: URL, key: string) {
	const rawValue = url.searchParams.get(key)
	if (!rawValue) return undefined
	const value = Number(rawValue)
	return Number.isFinite(value) ? value : undefined
}

function getPositiveIntQueryParam(url: URL, key: string) {
	const value = getNumberQueryParam(url, key)
	if (value === undefined) return undefined
	const normalized = Math.floor(value)
	if (normalized < 1) return undefined
	return normalized
}

function getMoneyCentsQueryParam(url: URL, key: string) {
	const rawValue = url.searchParams.get(key)
	if (!rawValue) return undefined
	const value = Number(rawValue)
	if (!Number.isFinite(value)) return undefined
	return Math.max(Math.round(value * 100), 0)
}

function getOptionalIsoString(url: URL, key: string) {
	const value = url.searchParams.get(key)
	if (!value) return undefined
	return value
}

function getTransactionType(url: URL) {
	const type = url.searchParams.get('type')
	if (type === 'add' || type === 'remove') return type
	return undefined
}

function createLedgerMutationHandler<Input, Result = void>(
	appEnv: AppEnv,
	setup: {
		schema: Schema<unknown, Input>
		run: (service: LedgerService, input: Input) => Promise<Result>
		status?: number
		mapResponse?: (result: Result) => Record<string, unknown>
	},
) {
	return {
		middleware: [],
		async action({ request }: { request: Request }) {
			const access = await readLedgerService(request, appEnv)
			if (!access.ok) return access.response
			const parsedBody = await parseJsonBody(request, setup.schema)
			if (!parsedBody.ok) return parsedBody.response
			const result = await setup.run(access.service, parsedBody.value)
			return jsonResponse(
				{ ok: true, ...(setup.mapResponse?.(result) ?? {}) },
				setup.status,
				access.headers ?? undefined,
			)
		},
	}
}

export function createLedgerDashboardHandler(appEnv: AppEnv) {
	return {
		middleware: [],
		async action({ request }) {
			const access = await readLedgerService(request, appEnv)
			if (!access.ok) return access.response
			const dashboard = await access.service.getDashboard()
			return jsonResponse(
				{ ok: true, dashboard },
				200,
				access.headers ?? undefined,
			)
		},
	} satisfies Action<typeof routes.apiLedgerDashboard>
}

export function createLedgerSettingsHandler(appEnv: AppEnv) {
	return {
		middleware: [],
		async action({ request }) {
			const access = await readLedgerService(request, appEnv)
			if (!access.ok) return access.response
			const [kids, archived, quickAmounts] = await Promise.all([
				access.service.listKidsWithAccounts(true),
				access.service.listArchived(),
				access.service.listQuickAmounts(),
			])
			return jsonResponse(
				{
					ok: true,
					settings: { kids, archived, quickAmounts },
				},
				200,
				access.headers ?? undefined,
			)
		},
	} satisfies Action<typeof routes.apiLedgerSettings>
}

export function createLedgerHistoryHandler(appEnv: AppEnv) {
	return {
		middleware: [],
		async action({ request, url }) {
			const access = await readLedgerService(request, appEnv)
			if (!access.ok) return access.response
			const result = await access.service.listTransactions({
				kidId: getNumberQueryParam(url, 'kidId'),
				accountId: getNumberQueryParam(url, 'accountId'),
				type: getTransactionType(url),
				from: getOptionalIsoString(url, 'from'),
				to: getOptionalIsoString(url, 'to'),
				minAmountCents: getMoneyCentsQueryParam(url, 'minAmount'),
				maxAmountCents: getMoneyCentsQueryParam(url, 'maxAmount'),
				after: getOptionalIsoString(url, 'after'),
				before: getOptionalIsoString(url, 'before'),
				page: getPositiveIntQueryParam(url, 'page'),
				limit: getPositiveIntQueryParam(url, 'limit'),
				offset: getNumberQueryParam(url, 'offset'),
			})
			return jsonResponse(
				{ ok: true, ...result },
				200,
				access.headers ?? undefined,
			)
		},
	} satisfies Action<typeof routes.apiLedgerHistory>
}

export function createKidCreateHandler(appEnv: AppEnv) {
	return createLedgerMutationHandler(appEnv, {
		schema: createKidSchema,
		run: (service, input) => service.createKid(input),
		status: 201,
		mapResponse: (created) => ({ kidId: created.id }),
	}) satisfies Action<typeof routes.apiKidsCreate>
}

export function createKidUpdateHandler(appEnv: AppEnv) {
	return createLedgerMutationHandler(appEnv, {
		schema: updateKidSchema,
		run: (service, input) => service.updateKid(input),
	}) satisfies Action<typeof routes.apiKidsUpdate>
}

export function createKidReorderHandler(appEnv: AppEnv) {
	return createLedgerMutationHandler(appEnv, {
		schema: reorderKidsSchema,
		run: (service, input) => service.reorderKids(input.kidIds),
	}) satisfies Action<typeof routes.apiKidsReorder>
}

export function createKidArchiveHandler(appEnv: AppEnv) {
	return createLedgerMutationHandler(appEnv, {
		schema: kidIdSchema,
		run: (service, input) => service.archiveKid(input.kidId),
	}) satisfies Action<typeof routes.apiKidsArchive>
}

export function createKidUnarchiveHandler(appEnv: AppEnv) {
	return createLedgerMutationHandler(appEnv, {
		schema: kidIdSchema,
		run: (service, input) => service.unarchiveKid(input.kidId),
	}) satisfies Action<typeof routes.apiKidsUnarchive>
}

export function createKidDeleteHandler(appEnv: AppEnv) {
	return createLedgerMutationHandler(appEnv, {
		schema: kidIdSchema,
		run: (service, input) => service.deleteKidPermanently(input.kidId),
	}) satisfies Action<typeof routes.apiKidsDelete>
}

export function createAccountCreateHandler(appEnv: AppEnv) {
	return createLedgerMutationHandler(appEnv, {
		schema: createAccountSchema,
		run: (service, input) => service.createAccount(input),
		status: 201,
		mapResponse: (created) => ({ accountId: created.id }),
	}) satisfies Action<typeof routes.apiAccountsCreate>
}

export function createAccountUpdateHandler(appEnv: AppEnv) {
	return createLedgerMutationHandler(appEnv, {
		schema: updateAccountSchema,
		run: (service, input) => service.updateAccount(input),
	}) satisfies Action<typeof routes.apiAccountsUpdate>
}

export function createAccountReorderHandler(appEnv: AppEnv) {
	return createLedgerMutationHandler(appEnv, {
		schema: reorderAccountsSchema,
		run: (service, input) => service.reorderAccounts(input),
	}) satisfies Action<typeof routes.apiAccountsReorder>
}

export function createAccountArchiveHandler(appEnv: AppEnv) {
	return createLedgerMutationHandler(appEnv, {
		schema: accountIdSchema,
		run: (service, input) => service.archiveAccount(input.accountId),
	}) satisfies Action<typeof routes.apiAccountsArchive>
}

export function createAccountUnarchiveHandler(appEnv: AppEnv) {
	return createLedgerMutationHandler(appEnv, {
		schema: accountIdSchema,
		run: (service, input) => service.unarchiveAccount(input.accountId),
	}) satisfies Action<typeof routes.apiAccountsUnarchive>
}

export function createAccountDeleteHandler(appEnv: AppEnv) {
	return createLedgerMutationHandler(appEnv, {
		schema: accountIdSchema,
		run: (service, input) => service.deleteAccountPermanently(input.accountId),
	}) satisfies Action<typeof routes.apiAccountsDelete>
}

export function createTransactionCreateHandler(appEnv: AppEnv) {
	return createLedgerMutationHandler(appEnv, {
		schema: createTransactionSchema,
		run: (service, input) => service.addTransaction(input),
		mapResponse: (result) => ({ result }),
	}) satisfies Action<typeof routes.apiTransactionsCreate>
}

export function createTransferCreateHandler(appEnv: AppEnv) {
	return createLedgerMutationHandler(appEnv, {
		schema: createTransferSchema,
		run: (service, input) => service.transferBetweenAccounts(input),
		mapResponse: (result) => ({ result }),
	}) satisfies Action<typeof routes.apiTransfersCreate>
}

export function createQuickAmountsSetHandler(appEnv: AppEnv) {
	return createLedgerMutationHandler(appEnv, {
		schema: setQuickAmountsSchema,
		run: async (service, input) => {
			await service.setQuickAmounts(input.amounts)
			return service.listQuickAmounts()
		},
		mapResponse: (quickAmounts) => ({ quickAmounts }),
	}) satisfies Action<typeof routes.apiQuickAmountsSet>
}

export function createExportJsonHandler(appEnv: AppEnv) {
	return {
		middleware: [],
		async action({ request }) {
			const access = await readLedgerService(request, appEnv)
			if (!access.ok) return access.response
			const payload = await access.service.exportLedgerData()
			const response = new Response(JSON.stringify(payload, null, 2), {
				headers: {
					'Content-Type': 'application/json',
					'Content-Disposition':
						'attachment; filename="kids-ledger-export.json"',
					'Cache-Control': 'no-store',
				},
			})
			if (access.headers) {
				for (const [key, value] of access.headers) {
					response.headers.append(key, value)
				}
			}
			return response
		},
	} satisfies Action<typeof routes.apiExportJson>
}
