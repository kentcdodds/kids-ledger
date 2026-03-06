import { type BuildAction } from 'remix/fetch-router'
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
	colorToken: string(),
})

const updateAccountSchema = object({
	accountId: number(),
	name: string(),
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
			return jsonResponse({ ok: true, dashboard })
		},
	} satisfies BuildAction<
		typeof routes.apiLedgerDashboard.method,
		typeof routes.apiLedgerDashboard.pattern
	>
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
			return jsonResponse({
				ok: true,
				settings: { kids, archived, quickAmounts },
			})
		},
	} satisfies BuildAction<
		typeof routes.apiLedgerSettings.method,
		typeof routes.apiLedgerSettings.pattern
	>
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
			return jsonResponse({ ok: true, ...result })
		},
	} satisfies BuildAction<
		typeof routes.apiLedgerHistory.method,
		typeof routes.apiLedgerHistory.pattern
	>
}

export function createKidCreateHandler(appEnv: AppEnv) {
	return createLedgerMutationHandler(appEnv, {
		schema: createKidSchema,
		run: (service, input) => service.createKid(input),
		status: 201,
		mapResponse: (created) => ({ kidId: created.id }),
	}) satisfies BuildAction<
		typeof routes.apiKidsCreate.method,
		typeof routes.apiKidsCreate.pattern
	>
}

export function createKidUpdateHandler(appEnv: AppEnv) {
	return createLedgerMutationHandler(appEnv, {
		schema: updateKidSchema,
		run: (service, input) => service.updateKid(input),
	}) satisfies BuildAction<
		typeof routes.apiKidsUpdate.method,
		typeof routes.apiKidsUpdate.pattern
	>
}

export function createKidReorderHandler(appEnv: AppEnv) {
	return createLedgerMutationHandler(appEnv, {
		schema: reorderKidsSchema,
		run: (service, input) => service.reorderKids(input.kidIds),
	}) satisfies BuildAction<
		typeof routes.apiKidsReorder.method,
		typeof routes.apiKidsReorder.pattern
	>
}

export function createKidArchiveHandler(appEnv: AppEnv) {
	return createLedgerMutationHandler(appEnv, {
		schema: kidIdSchema,
		run: (service, input) => service.archiveKid(input.kidId),
	}) satisfies BuildAction<
		typeof routes.apiKidsArchive.method,
		typeof routes.apiKidsArchive.pattern
	>
}

export function createKidUnarchiveHandler(appEnv: AppEnv) {
	return createLedgerMutationHandler(appEnv, {
		schema: kidIdSchema,
		run: (service, input) => service.unarchiveKid(input.kidId),
	}) satisfies BuildAction<
		typeof routes.apiKidsUnarchive.method,
		typeof routes.apiKidsUnarchive.pattern
	>
}

export function createKidDeleteHandler(appEnv: AppEnv) {
	return createLedgerMutationHandler(appEnv, {
		schema: kidIdSchema,
		run: (service, input) => service.deleteKidPermanently(input.kidId),
	}) satisfies BuildAction<
		typeof routes.apiKidsDelete.method,
		typeof routes.apiKidsDelete.pattern
	>
}

export function createAccountCreateHandler(appEnv: AppEnv) {
	return createLedgerMutationHandler(appEnv, {
		schema: createAccountSchema,
		run: (service, input) => service.createAccount(input),
		status: 201,
		mapResponse: (created) => ({ accountId: created.id }),
	}) satisfies BuildAction<
		typeof routes.apiAccountsCreate.method,
		typeof routes.apiAccountsCreate.pattern
	>
}

export function createAccountUpdateHandler(appEnv: AppEnv) {
	return createLedgerMutationHandler(appEnv, {
		schema: updateAccountSchema,
		run: (service, input) => service.updateAccount(input),
	}) satisfies BuildAction<
		typeof routes.apiAccountsUpdate.method,
		typeof routes.apiAccountsUpdate.pattern
	>
}

export function createAccountReorderHandler(appEnv: AppEnv) {
	return createLedgerMutationHandler(appEnv, {
		schema: reorderAccountsSchema,
		run: (service, input) => service.reorderAccounts(input),
	}) satisfies BuildAction<
		typeof routes.apiAccountsReorder.method,
		typeof routes.apiAccountsReorder.pattern
	>
}

export function createAccountArchiveHandler(appEnv: AppEnv) {
	return createLedgerMutationHandler(appEnv, {
		schema: accountIdSchema,
		run: (service, input) => service.archiveAccount(input.accountId),
	}) satisfies BuildAction<
		typeof routes.apiAccountsArchive.method,
		typeof routes.apiAccountsArchive.pattern
	>
}

export function createAccountUnarchiveHandler(appEnv: AppEnv) {
	return createLedgerMutationHandler(appEnv, {
		schema: accountIdSchema,
		run: (service, input) => service.unarchiveAccount(input.accountId),
	}) satisfies BuildAction<
		typeof routes.apiAccountsUnarchive.method,
		typeof routes.apiAccountsUnarchive.pattern
	>
}

export function createAccountDeleteHandler(appEnv: AppEnv) {
	return createLedgerMutationHandler(appEnv, {
		schema: accountIdSchema,
		run: (service, input) => service.deleteAccountPermanently(input.accountId),
	}) satisfies BuildAction<
		typeof routes.apiAccountsDelete.method,
		typeof routes.apiAccountsDelete.pattern
	>
}

export function createTransactionCreateHandler(appEnv: AppEnv) {
	return createLedgerMutationHandler(appEnv, {
		schema: createTransactionSchema,
		run: (service, input) => service.addTransaction(input),
		mapResponse: (result) => ({ result }),
	}) satisfies BuildAction<
		typeof routes.apiTransactionsCreate.method,
		typeof routes.apiTransactionsCreate.pattern
	>
}

export function createQuickAmountsSetHandler(appEnv: AppEnv) {
	return createLedgerMutationHandler(appEnv, {
		schema: setQuickAmountsSchema,
		run: async (service, input) => {
			await service.setQuickAmounts(input.amounts)
			return service.listQuickAmounts()
		},
		mapResponse: (quickAmounts) => ({ quickAmounts }),
	}) satisfies BuildAction<
		typeof routes.apiQuickAmountsSet.method,
		typeof routes.apiQuickAmountsSet.pattern
	>
}

export function createExportJsonHandler(appEnv: AppEnv) {
	return {
		middleware: [],
		async action({ request }) {
			const access = await readLedgerService(request, appEnv)
			if (!access.ok) return access.response
			const payload = await access.service.exportLedgerData()
			return new Response(JSON.stringify(payload, null, 2), {
				headers: {
					'Content-Type': 'application/json',
					'Content-Disposition':
						'attachment; filename="kids-ledger-export.json"',
					'Cache-Control': 'no-store',
				},
			})
		},
	} satisfies BuildAction<
		typeof routes.apiExportJson.method,
		typeof routes.apiExportJson.pattern
	>
}
