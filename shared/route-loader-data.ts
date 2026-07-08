export type SessionInfo = {
	email: string
}

export type KidAccount = {
	id: number
	kidId: number
	name: string
	apyBasisPoints: number
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

export type LedgerSettings = {
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
			apyBasisPoints: number
			colorToken: string
			sortOrder: number
			kidId: number
			kidName: string
		}>
	}
	quickAmounts: Array<number>
}

export type OAuthAuthorizeLoaderData = {
	info: {
		client: { id: string; name: string }
		scopes: Array<string>
	} | null
	session: SessionInfo | null
	error: string | null
}

export type HistoryLoaderData = {
	settings: { ok: true; settings: LedgerSettings }
	transactions: LedgerTransactionsPage
}

export type AppLoaderData = {
	session: SessionInfo | null
	accountSession: SessionInfo | null
	dashboard: LedgerDashboard
	settings: { ok: true; settings: LedgerSettings }
	history: HistoryLoaderData
	oauthAuthorize: OAuthAuthorizeLoaderData
}

export type AppLoaderDataPayload = Partial<AppLoaderData>

export type AppLoaderDataEnvelope = {
	href: string
	data: AppLoaderDataPayload
}
