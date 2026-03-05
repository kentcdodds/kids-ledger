import { type Handle } from 'remix/component'
import {
	fetchSettings,
	fetchTransactions,
	type LedgerTransaction,
} from '#client/ledger-api.ts'
import { navigate } from '#client/client-router.tsx'
import { formatCents } from '#client/money.ts'
import { colors, radius, shadows, spacing } from '#client/styles/tokens.ts'
import { inputCss, buttonCss } from '#client/styles/form-controls.ts'

type HistoryState = {
	status: 'loading' | 'ready' | 'error'
	errorMessage: string
	transactions: Array<LedgerTransaction>
	kidOptions: Array<{ id: number; name: string }>
	accountOptions: Array<{ id: number; name: string; kidName: string }>
}

function getInitialQuery() {
	if (typeof window === 'undefined') return new URLSearchParams()
	return new URLSearchParams(window.location.search)
}

export function HistoryRoute(handle: Handle) {
	let state: HistoryState = {
		status: 'loading',
		errorMessage: '',
		transactions: [],
		kidOptions: [],
		accountOptions: [],
	}
	let query = getInitialQuery()

	function updateQuery(next: URLSearchParams) {
		query = next
		const queryString = query.toString()
		navigate(`/history${queryString ? `?${queryString}` : ''}`)
		void loadHistory()
	}

	async function loadHistory() {
		state = { ...state, status: 'loading', errorMessage: '' }
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
				transactions,
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
		handle.update()
	}

	handle.queueTask(async () => {
		await loadHistory()
	})

	return () => (
		<section css={{ display: 'grid', gap: spacing.lg }}>
			<header css={{ display: 'grid', gap: spacing.xs }}>
				<h1 css={{ margin: 0, color: colors.text }}>Transaction History</h1>
				<p css={{ margin: 0, color: colors.textMuted }}>
					Recent-first feed with URL-synced filters.
				</p>
			</header>

			<form
				css={{
					display: 'grid',
					gridTemplateColumns: 'repeat(5, minmax(0, 1fr)) auto',
					gap: spacing.sm,
					padding: spacing.md,
					border: `3px solid ${colors.border}`,
					borderRadius: radius.xl,
					backgroundColor: colors.surface,
					boxShadow: shadows.md,
				}}
				on={{
					submit: (event) => {
						event.preventDefault()
						if (!(event.currentTarget instanceof HTMLFormElement)) return
						const formData = new FormData(event.currentTarget)
						const next = new URLSearchParams()
						const kidId = String(formData.get('kidId') ?? '').trim()
						const accountId = String(formData.get('accountId') ?? '').trim()
						const type = String(formData.get('type') ?? '').trim()
						const from = String(formData.get('from') ?? '').trim()
						const to = String(formData.get('to') ?? '').trim()
						if (kidId) next.set('kidId', kidId)
						if (accountId) next.set('accountId', accountId)
						if (type) next.set('type', type)
						if (from) next.set('from', from)
						if (to) next.set('to', to)
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
				<button type="submit" css={buttonCss}>
					Apply
				</button>
			</form>

			{state.status === 'loading' ? (
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
								color: transaction.amountCents < 0 ? colors.error : colors.text,
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
		</section>
	)
}
