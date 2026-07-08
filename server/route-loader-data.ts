import { readAuthSessionState } from '#server/auth-session.ts'
import { createLedgerService } from '#server/ledger/ledger-service.ts'
import { type AppEnv } from '#types/env-schema.ts'
import {
	type AppLoaderDataEnvelope,
	type AppLoaderDataPayload,
} from '#shared/route-loader-data.ts'

const defaultHistoryPageSize = 50

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

function getRequestHref(request: Request) {
	const url = new URL(request.url)
	return `${url.pathname}${url.search}${url.hash}`
}

function getSessionPayload(
	session: Awaited<ReturnType<typeof readAuthSessionState>>['session'],
) {
	return session ? { email: session.email } : null
}

async function loadSettings(service: ReturnType<typeof createLedgerService>) {
	const [kids, archived, quickAmounts] = await Promise.all([
		service.listKidsWithAccounts(true),
		service.listArchived(),
		service.listQuickAmounts(),
	])
	return {
		ok: true as const,
		settings: { kids, archived, quickAmounts },
	}
}

async function loadHistory(
	url: URL,
	service: ReturnType<typeof createLedgerService>,
) {
	const transactions = await service.listTransactions({
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
		limit: getPositiveIntQueryParam(url, 'limit') ?? defaultHistoryPageSize,
		offset: getNumberQueryParam(url, 'offset'),
	})
	return {
		settings: await loadSettings(service),
		transactions,
	}
}

export async function loadServerRouteData(input: {
	request: Request
	appEnv: AppEnv
	authSessionState?: Awaited<ReturnType<typeof readAuthSessionState>>
}): Promise<AppLoaderDataEnvelope | null> {
	const { request, appEnv } = input
	const url = new URL(request.url)
	const authSessionState =
		input.authSessionState ?? (await readAuthSessionState(request))
	const session = getSessionPayload(authSessionState.session)
	const data: AppLoaderDataPayload = { session }
	const userId = Number(authSessionState.session?.id)
	const service =
		Number.isInteger(userId) && userId > 0
			? createLedgerService(appEnv.APP_DB, userId)
			: null

	if (url.pathname === '/account') {
		data.accountSession = session
	}

	if (service && url.pathname === '/') {
		data.dashboard = await service.getDashboard()
	}

	if (service && url.pathname === '/settings') {
		data.settings = await loadSettings(service)
	}

	if (service && url.pathname === '/history') {
		data.history = await loadHistory(url, service)
	}

	return {
		href: getRequestHref(request),
		data,
	}
}
