import { getErrorMessage, parseJsonOrNull } from '#client/http.ts'

export type KidAccount = {
	id: number
	kidId: number
	name: string
	colorToken: string
	sortOrder: number
	isArchived: boolean
	balanceCents: number
}

export type KidSummary = {
	id: number
	householdId: number
	name: string
	emoji: string
	transactionModalCss: string
	sortOrder: number
	isArchived: boolean
	totalBalanceCents: number
	accounts: Array<KidAccount>
}

export type LedgerDashboard = {
	householdId: number
	householdName: string
	familyBalanceCents: number
	kids: Array<KidSummary>
	quickAmounts: Array<number>
}

export type LedgerTransaction = {
	id: number
	householdId: number
	kidId: number
	kidName: string
	kidEmoji: string
	accountId: number
	accountName: string
	colorToken: string
	amountCents: number
	note: string
	createdAt: string
}

export type LedgerTransactionsPage = {
	transactions: Array<LedgerTransaction>
	page: number
	pageSize: number
	totalCount: number
	totalPages: number
	hasPreviousPage: boolean
	hasNextPage: boolean
	startCursor: string | null
	endCursor: string | null
	middleCursor: string | null
	endPageCursor: string | null
}

async function parseApiResponse<T>(response: Response): Promise<T> {
	const payload = await parseJsonOrNull(response)
	if (!response.ok || !payload) {
		throw new Error(
			getErrorMessage(payload, `Request failed (${response.status})`),
		)
	}
	return payload as T
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
	const response = await fetch(path, {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	})
	return parseApiResponse<T>(response)
}

async function getJson<T>(path: string): Promise<T> {
	const response = await fetch(path, {
		credentials: 'include',
		headers: { Accept: 'application/json' },
	})
	return parseApiResponse<T>(response)
}

export async function fetchDashboard() {
	const payload = await getJson<{ ok: true; dashboard: LedgerDashboard }>(
		'/ledger/dashboard',
	)
	return payload.dashboard
}

export async function fetchSettings() {
	return getJson<{
		ok: true
		settings: {
			kids: Array<KidSummary>
			archived: {
				kids: Array<{
					id: number
					name: string
					emoji: string
					sortOrder: number
				}>
				accounts: Array<{
					id: number
					name: string
					colorToken: string
					sortOrder: number
					kidId: number
					kidName: string
				}>
			}
			quickAmounts: Array<number>
		}
	}>('/ledger/settings')
}

export async function fetchTransactions(query: URLSearchParams) {
	const payload = await getJson<{
		ok: true
		transactions: Array<LedgerTransaction>
		page: number
		pageSize: number
		totalCount: number
		totalPages: number
		hasPreviousPage: boolean
		hasNextPage: boolean
		startCursor: string | null
		endCursor: string | null
		middleCursor: string | null
		endPageCursor: string | null
	}>(`/ledger/history?${query.toString()}`)
	return {
		transactions: payload.transactions,
		page: payload.page,
		pageSize: payload.pageSize,
		totalCount: payload.totalCount,
		totalPages: payload.totalPages,
		hasPreviousPage: payload.hasPreviousPage,
		hasNextPage: payload.hasNextPage,
		startCursor: payload.startCursor,
		endCursor: payload.endCursor,
		middleCursor: payload.middleCursor,
		endPageCursor: payload.endPageCursor,
	} satisfies LedgerTransactionsPage
}

export async function createKid(input: {
	name: string
	emoji: string
	transactionModalCss?: string
}) {
	return postJson<{ ok: true; kidId: number }>('/ledger/kids/create', input)
}

export async function updateKid(input: {
	kidId: number
	name: string
	emoji: string
	transactionModalCss?: string
}) {
	return postJson<{ ok: true }>('/ledger/kids/update', input)
}

export async function reorderKids(kidIds: Array<number>) {
	return postJson<{ ok: true }>('/ledger/kids/reorder', { kidIds })
}

export async function archiveKid(kidId: number) {
	return postJson<{ ok: true }>('/ledger/kids/archive', { kidId })
}

export async function unarchiveKid(kidId: number) {
	return postJson<{ ok: true }>('/ledger/kids/unarchive', { kidId })
}

export async function deleteKid(kidId: number) {
	return postJson<{ ok: true }>('/ledger/kids/delete', { kidId })
}

export async function createAccount(input: {
	kidId: number
	name: string
	colorToken: string
}) {
	return postJson<{ ok: true; accountId: number }>(
		'/ledger/accounts/create',
		input,
	)
}

export async function updateAccount(input: {
	accountId: number
	name: string
	colorToken: string
}) {
	return postJson<{ ok: true }>('/ledger/accounts/update', input)
}

export async function reorderAccounts(
	kidId: number,
	accountIds: Array<number>,
) {
	return postJson<{ ok: true }>('/ledger/accounts/reorder', {
		kidId,
		accountIds,
	})
}

export async function archiveAccount(accountId: number) {
	return postJson<{ ok: true }>('/ledger/accounts/archive', { accountId })
}

export async function unarchiveAccount(accountId: number) {
	return postJson<{ ok: true }>('/ledger/accounts/unarchive', { accountId })
}

export async function deleteAccount(accountId: number) {
	return postJson<{ ok: true }>('/ledger/accounts/delete', { accountId })
}

export async function createTransaction(input: {
	accountId: number
	amountCents: number
	note?: string
}) {
	return postJson<{
		ok: true
		result: { accountId: number; balanceCents: number; warning: string | null }
	}>('/ledger/transactions/create', input)
}

export async function setQuickAmounts(amounts: Array<number>) {
	return postJson<{ ok: true; quickAmounts: Array<number> }>(
		'/ledger/quick-amounts/set',
		{ amounts },
	)
}
