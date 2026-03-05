import { type Handle } from 'remix/component'
import {
	fetchSettings,
	fetchTransactions,
	type LedgerTransaction,
} from '#client/ledger-api.ts'
import { listenToRouterNavigation, navigate } from '#client/client-router.tsx'
import { formatCents } from '#client/money.ts'
import { createSpinDelay } from '#client/spin-delay.ts'
import { colors, mq, radius, shadows, spacing } from '#client/styles/tokens.ts'
import { inputCss, buttonCss } from '#client/styles/form-controls.ts'

type HistoryState = {
	status: 'loading' | 'ready' | 'error'
	errorMessage: string
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
	kidOptions: Array<{ id: number; name: string }>
	accountOptions: Array<{ id: number; name: string; kidName: string }>
}

const defaultHistoryPageSize = 50

function getInitialQuery() {
	if (typeof window === 'undefined') return new URLSearchParams()
	return new URLSearchParams(window.location.search)
}

function getPage(query: URLSearchParams) {
	const rawValue = Number(query.get('page') ?? '1')
	if (!Number.isFinite(rawValue)) return 1
	return Math.max(Math.floor(rawValue), 1)
}

function getHistoryHref(
	query: URLSearchParams,
	cursors: { before?: string | null; after?: string | null },
) {
	const next = new URLSearchParams(query)
	next.delete('page')
	next.delete('offset')
	next.delete('before')
	next.delete('after')
	if (cursors.before) next.set('before', cursors.before)
	if (cursors.after) next.set('after', cursors.after)
	const queryString = next.toString()
	return `/history${queryString ? `?${queryString}` : ''}`
}

const paginationLinkCss = {
	...buttonCss,
	display: 'inline-flex',
	alignItems: 'center',
	justifyContent: 'center',
	textDecoration: 'none',
	width: '100%',
	userSelect: 'none',
}

const disabledPaginationControlCss = {
	...paginationLinkCss,
	opacity: 0.6,
	cursor: 'not-allowed',
	pointerEvents: 'auto',
	userSelect: 'none',
	boxShadow: 'none',
	transform: 'none',
}

export function HistoryRoute(handle: Handle) {
	let query = getInitialQuery()
	if (!query.get('limit')) {
		query.set('limit', String(defaultHistoryPageSize))
	}
	let state: HistoryState = {
		status: 'loading',
		errorMessage: '',
		transactions: [],
		page: getPage(query),
		pageSize: defaultHistoryPageSize,
		totalCount: 0,
		totalPages: 1,
		hasPreviousPage: false,
		hasNextPage: false,
		startCursor: null,
		endCursor: null,
		middleCursor: null,
		endPageCursor: null,
		kidOptions: [],
		accountOptions: [],
	}
	const pendingRefreshDelay = createSpinDelay(() => {
		handle.update()
	})

	function updateQuery(next: URLSearchParams) {
		if (!next.get('limit')) {
			next.set('limit', String(defaultHistoryPageSize))
		}
		const queryString = next.toString()
		navigate(`/history${queryString ? `?${queryString}` : ''}`)
	}

	function onPaginationLinkClick(event: MouseEvent) {
		if (pendingRefreshDelay.isShowing()) {
			event.preventDefault()
			return
		}
		event.preventDefault()
		if (!(event.currentTarget instanceof HTMLAnchorElement)) return
		const href = event.currentTarget.getAttribute('href')
		if (!href) return
		const url = new URL(href, window.location.origin)
		updateQuery(new URLSearchParams(url.search))
	}

	async function loadHistory() {
		state = { ...state, status: 'loading', errorMessage: '' }
		pendingRefreshDelay.setLoading(true)
		handle.update()
		try {
			const [settingsPayload, transactions] = await Promise.all([
				fetchSettings(),
				fetchTransactions(query),
			])
			const kidOptions = settingsPayload.settings.kids.map((kid) => ({
				id: kid.id,
				name: kid.name,
			}))
			const accountOptions = settingsPayload.settings.kids.flatMap((kid) =>
				kid.accounts.map((account) => ({
					id: account.id,
					name: account.name,
					kidName: kid.name,
				})),
			)
			state = {
				status: 'ready',
				errorMessage: '',
				transactions: transactions.transactions,
				page: transactions.page,
				pageSize: transactions.pageSize,
				totalCount: transactions.totalCount,
				totalPages: transactions.totalPages,
				hasPreviousPage: transactions.hasPreviousPage,
				hasNextPage: transactions.hasNextPage,
				startCursor: transactions.startCursor,
				endCursor: transactions.endCursor,
				middleCursor: transactions.middleCursor,
				endPageCursor: transactions.endPageCursor,
				kidOptions,
				accountOptions,
			}
		} catch (error) {
			state = {
				...state,
				status: 'error',
				errorMessage:
					error instanceof Error ? error.message : 'Failed to load history.',
			}
		}
		pendingRefreshDelay.setLoading(false)
		handle.update()
	}

	handle.queueTask(async () => {
		await loadHistory()
	})
	listenToRouterNavigation(handle, () => {
		const next = getInitialQuery()
		if (!next.get('limit')) {
			next.set('limit', String(defaultHistoryPageSize))
		}
		if (next.toString() === query.toString()) return
		query = next
		void loadHistory()
	})

	return () => {
		const showPendingRefresh =
			state.transactions.length > 0 && pendingRefreshDelay.isShowing()
		return (
			<section
				css={{ display: 'grid', gap: spacing.lg, paddingBottom: spacing.xl }}
			>
				<header css={{ display: 'grid', gap: spacing.xs }}>
					<h1 css={{ margin: 0, color: colors.text }}>Transaction History</h1>
					<p css={{ margin: 0, color: colors.textMuted }}>
						Recent-first feed with URL-synced filters.
					</p>
				</header>

				<form
					key={`history-filters-${query.toString()}`}
					css={{
						display: 'grid',
						gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
						gap: spacing.sm,
						padding: spacing.md,
						border: `3px solid ${colors.border}`,
						borderRadius: radius.xl,
						backgroundColor: colors.surface,
						boxShadow: shadows.md,
						opacity: showPendingRefresh ? 0.6 : 1,
						transition: 'opacity 120ms ease',
						pointerEvents: showPendingRefresh ? 'none' : 'auto',
						[mq.mobile]: {
							gridTemplateColumns: '1fr',
						},
					}}
					on={{
						submit: (event) => {
							event.preventDefault()
							if (showPendingRefresh) return
							if (!(event.currentTarget instanceof HTMLFormElement)) return
							const formData = new FormData(event.currentTarget)
							const next = new URLSearchParams()
							const kidId = String(formData.get('kidId') ?? '').trim()
							const accountId = String(formData.get('accountId') ?? '').trim()
							const type = String(formData.get('type') ?? '').trim()
							const from = String(formData.get('from') ?? '').trim()
							const to = String(formData.get('to') ?? '').trim()
							const minAmount = String(formData.get('minAmount') ?? '').trim()
							const maxAmount = String(formData.get('maxAmount') ?? '').trim()
							if (kidId) next.set('kidId', kidId)
							if (accountId) next.set('accountId', accountId)
							if (type) next.set('type', type)
							if (from) next.set('from', from)
							if (to) next.set('to', to)
							if (minAmount) next.set('minAmount', minAmount)
							if (maxAmount) next.set('maxAmount', maxAmount)
							next.set('limit', String(defaultHistoryPageSize))
							updateQuery(next)
						},
					}}
				>
					<select
						name="kidId"
						defaultValue={query.get('kidId') ?? ''}
						css={inputCss}
					>
						<option value="">All kids</option>
						{state.kidOptions.map((kid) => (
							<option key={kid.id} value={String(kid.id)}>
								{kid.name}
							</option>
						))}
					</select>
					<select
						name="accountId"
						defaultValue={query.get('accountId') ?? ''}
						css={inputCss}
					>
						<option value="">All accounts</option>
						{state.accountOptions.map((account) => (
							<option key={account.id} value={String(account.id)}>
								{account.kidName} · {account.name}
							</option>
						))}
					</select>
					<select
						name="type"
						defaultValue={query.get('type') ?? ''}
						css={inputCss}
					>
						<option value="">All types</option>
						<option value="add">Adds only</option>
						<option value="remove">Removals only</option>
					</select>
					<input
						name="from"
						type="date"
						defaultValue={query.get('from') ?? ''}
						css={inputCss}
					/>
					<input
						name="to"
						type="date"
						defaultValue={query.get('to') ?? ''}
						css={inputCss}
					/>
					<input
						name="minAmount"
						type="number"
						min="0"
						step="0.01"
						placeholder="Min amount"
						defaultValue={query.get('minAmount') ?? ''}
						css={inputCss}
					/>
					<input
						name="maxAmount"
						type="number"
						min="0"
						step="0.01"
						placeholder="Max amount"
						defaultValue={query.get('maxAmount') ?? ''}
						css={inputCss}
					/>
					<button type="submit" css={buttonCss}>
						Apply
					</button>
				</form>

				{state.status === 'loading' && state.transactions.length === 0 ? (
					<p css={{ color: colors.textMuted }}>Loading transactions...</p>
				) : null}
				{state.status === 'error' ? (
					<p css={{ color: colors.error }}>{state.errorMessage}</p>
				) : null}
				{state.status === 'ready' && state.transactions.length === 0 ? (
					<p css={{ color: colors.textMuted }}>
						No transactions match the current filters.
					</p>
				) : null}

				{state.transactions.map((transaction) => (
					<article
						key={transaction.id}
						css={{
							display: 'grid',
							gap: spacing.xs,
							padding: spacing.md,
							borderRadius: radius.lg,
							border: `2px solid ${colors.border}`,
							backgroundColor: colors.surface,
							boxShadow: shadows.sm,
							opacity: showPendingRefresh ? 0.6 : 1,
							transition: 'opacity 120ms ease',
						}}
					>
						<div
							css={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
							}}
						>
							<strong>
								{transaction.kidName} · {transaction.accountName}
							</strong>
							<strong
								css={{
									color:
										transaction.amountCents < 0 ? colors.error : colors.text,
								}}
							>
								{transaction.amountCents < 0 ? '-' : '+'}
								{formatCents(Math.abs(transaction.amountCents))}
							</strong>
						</div>
						{transaction.note ? (
							<p css={{ margin: 0, color: colors.text }}>{transaction.note}</p>
						) : null}
						<time css={{ color: colors.textMuted }}>
							{new Date(transaction.createdAt).toLocaleString()}
						</time>
					</article>
				))}
				{state.status !== 'error' &&
				(state.status === 'ready' || state.transactions.length > 0) ? (
					<div
						css={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							flexWrap: 'wrap',
							gap: spacing.sm,
							opacity: showPendingRefresh ? 0.6 : 1,
							transition: 'opacity 120ms ease',
							pointerEvents: showPendingRefresh ? 'none' : 'auto',
						}}
					>
						<span css={{ color: colors.textMuted }}>
							{state.totalCount} matching transaction
							{state.totalCount === 1 ? '' : 's'} · Page {state.page} of{' '}
							{state.totalPages} · up to {state.pageSize} per page
						</span>
						{state.totalCount > 0 ? (
							<div
								css={{
									display: 'grid',
									gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
									gap: spacing.sm,
									width: '100%',
									[mq.mobile]: {
										gridTemplateColumns: '1fr',
									},
								}}
							>
								{state.hasPreviousPage ? (
									<a
										href={getHistoryHref(query, {})}
										css={paginationLinkCss}
										on={{ click: onPaginationLinkClick }}
									>
										Start
									</a>
								) : (
									<span aria-disabled="true" css={disabledPaginationControlCss}>
										Start
									</span>
								)}
								{state.hasPreviousPage && state.startCursor ? (
									<a
										href={getHistoryHref(query, { before: state.startCursor })}
										css={paginationLinkCss}
										on={{ click: onPaginationLinkClick }}
									>
										Previous
									</a>
								) : (
									<span aria-disabled="true" css={disabledPaginationControlCss}>
										Previous
									</span>
								)}
								{state.totalPages > 2 &&
								state.page !== Math.ceil(state.totalPages / 2) &&
								state.middleCursor &&
								state.middleCursor !== state.endPageCursor &&
								state.middleCursor !== state.endCursor ? (
									<a
										href={getHistoryHref(query, { after: state.middleCursor })}
										css={paginationLinkCss}
										on={{ click: onPaginationLinkClick }}
									>
										Middle
									</a>
								) : (
									<span aria-disabled="true" css={disabledPaginationControlCss}>
										Middle
									</span>
								)}
								{state.hasNextPage ? (
									<a
										href={getHistoryHref(query, { after: state.endCursor })}
										css={paginationLinkCss}
										on={{ click: onPaginationLinkClick }}
									>
										Next
									</a>
								) : (
									<span aria-disabled="true" css={disabledPaginationControlCss}>
										Next
									</span>
								)}
								{state.endPageCursor && state.hasNextPage ? (
									<a
										href={getHistoryHref(query, { after: state.endPageCursor })}
										css={paginationLinkCss}
										on={{ click: onPaginationLinkClick }}
									>
										End
									</a>
								) : (
									<span aria-disabled="true" css={disabledPaginationControlCss}>
										End
									</span>
								)}
							</div>
						) : null}
					</div>
				) : null}
			</section>
		)
	}
}

export const Component = HistoryRoute

export function getMetadata() {
	return { title: 'History' }
}
