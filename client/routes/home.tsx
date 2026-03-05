import { type Handle } from 'remix/component'
import {
	createTransaction,
	fetchDashboard,
	type KidAccount,
	type KidSummary,
} from '#client/ledger-api.ts'
import { launchConfetti } from '#client/confetti.ts'
import { formatCents, parseAmountToCents } from '#client/money.ts'
import {
	colors,
	radius,
	shadows,
	spacing,
	transitions,
	typography,
} from '#client/styles/tokens.ts'
import { inputCss, buttonCss } from '#client/styles/form-controls.ts'

type TransactionState = {
	kid: KidSummary
	account: KidAccount
	amount: string
	note: string
	status: 'idle' | 'saving'
	error: string | null
	warning: string | null
}

const accountGradients = {
	orchid: 'linear-gradient(135deg, #9541ff, #d26dff)',
	ocean: 'linear-gradient(135deg, #326dff, #42c6ff)',
	meadow: 'linear-gradient(135deg, #1aa867, #52d878)',
	flame: 'linear-gradient(135deg, #ff6a3c, #ff4d8f)',
	sun: 'linear-gradient(135deg, #f7b500, #fdd835)',
	night: 'linear-gradient(135deg, #3f4b66, #69758f)',
} as Record<string, string>

const modalCloseAnimationDurationMs = 220

function getAccountBackground(colorToken: string) {
	return accountGradients[colorToken] ?? accountGradients.orchid
}

function getFocusableElements(container: HTMLElement) {
	const selector =
		'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
	const candidates = Array.from(container.querySelectorAll(selector))
	return candidates.filter(
		(element): element is HTMLElement =>
			element instanceof HTMLElement && element.tabIndex >= 0,
	)
}

export function HomeRoute(handle: Handle) {
	let status: 'loading' | 'ready' | 'error' = 'loading'
	let errorMessage = ''
	let kids: Array<KidSummary> = []
	let familyBalance = 0
	let quickAmounts: Array<number> = []
	let transactionState: TransactionState | null = null
	let transactionModalOpener: HTMLButtonElement | null = null
	let transactionModalClosing = false
	let closeModalTimeoutId: number | null = null

	function clearCloseModalTimeout() {
		if (closeModalTimeoutId === null) return
		window.clearTimeout(closeModalTimeoutId)
		closeModalTimeoutId = null
	}

	function openTransactionModal(
		kid: KidSummary,
		account: KidAccount,
		opener: HTMLButtonElement,
	) {
		clearCloseModalTimeout()
		transactionModalOpener = opener
		transactionModalClosing = false
		transactionState = {
			kid,
			account,
			amount: '',
			note: '',
			status: 'idle',
			error: null,
			warning: null,
		}
		handle.update()
		handle.queueTask(() => {
			const closeButton = document.getElementById('transaction-modal-close')
			if (closeButton instanceof HTMLButtonElement) {
				closeButton.focus()
			}
		})
	}

	function closeTransactionModal() {
		if (!transactionState || transactionModalClosing) return
		const opener = transactionModalOpener
		transactionModalOpener = null
		transactionModalClosing = true
		handle.update()
		closeModalTimeoutId = window.setTimeout(() => {
			transactionState = null
			transactionModalClosing = false
			closeModalTimeoutId = null
			handle.update()
			if (opener?.isConnected) {
				handle.queueTask(() => {
					opener.focus()
				})
			}
		}, modalCloseAnimationDurationMs)
	}

	function handleTransactionModalKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault()
			closeTransactionModal()
			return
		}

		if (event.key !== 'Tab') return
		if (!(event.currentTarget instanceof HTMLElement)) return

		const focusableElements = getFocusableElements(event.currentTarget)
		if (focusableElements.length === 0) {
			event.preventDefault()
			return
		}

		const activeElement = document.activeElement
		const firstFocusableElement = focusableElements[0]
		const lastFocusableElement = focusableElements[focusableElements.length - 1]
		if (!firstFocusableElement || !lastFocusableElement) return
		const activeInModal = focusableElements.includes(activeElement as HTMLElement)

		if (event.shiftKey) {
			if (activeElement === firstFocusableElement || !activeInModal) {
				event.preventDefault()
				lastFocusableElement.focus()
			}
			return
		}

		if (activeElement === lastFocusableElement || !activeInModal) {
			event.preventDefault()
			firstFocusableElement.focus()
		}
	}

	async function refreshDashboard() {
		status = 'loading'
		handle.update()
		try {
			const dashboard = await fetchDashboard()
			kids = dashboard.kids
			familyBalance = dashboard.familyBalanceCents
			quickAmounts = dashboard.quickAmounts
			status = 'ready'
			errorMessage = ''
		} catch (error) {
			status = 'error'
			errorMessage =
				error instanceof Error ? error.message : 'Failed to load ledger data.'
		}
		handle.update()
	}

	handle.queueTask(async () => {
		await refreshDashboard()
	})

	function setTransactionAmountFromQuick(cents: number) {
		if (!transactionState) return
		transactionState.amount = (cents / 100).toFixed(2)
		transactionState.error = null
		handle.update()
	}

	async function submitTransaction(direction: 'add' | 'remove') {
		if (!transactionState || transactionState.status === 'saving') return
		const cents = parseAmountToCents(transactionState.amount)
		if (cents === null || cents <= 0) {
			transactionState.error = 'Enter an amount greater than zero.'
			handle.update()
			return
		}
		const accountId = transactionState.account.id
		const note = transactionState.note
		const signedAmount = direction === 'remove' ? -Math.abs(cents) : cents
		transactionState.status = 'saving'
		transactionState.error = null
		handle.update()
		closeTransactionModal()
		try {
			const result = await createTransaction({
				accountId,
				amountCents: signedAmount,
				note,
			})
			if (direction === 'add') {
				launchConfetti()
			}
			if (result.result.warning) {
				window.alert(result.result.warning)
			}
			await refreshDashboard()
		} catch (error) {
			window.alert(
				error instanceof Error ? error.message : 'Could not save transaction.',
			)
		}
	}

	return () => (
		<section css={{ display: 'grid', gap: spacing.lg }}>
			<header
				css={{
					display: 'grid',
					gap: spacing.sm,
					justifyItems: 'center',
					textAlign: 'center',
				}}
			>
				<img
					src="/logo.png"
					alt="kids-ledger logo"
					css={{ width: '240px', maxWidth: '100%', height: 'auto' }}
				/>
				<p css={{ margin: 0, color: colors.textMuted }}>
					Family Total:{' '}
					<strong css={{ color: colors.text }}>
						{formatCents(familyBalance)}
					</strong>
				</p>
			</header>

			{status === 'loading' ? (
				<p css={{ color: colors.textMuted }}>Loading your ledger...</p>
			) : null}
			{status === 'error' ? (
				<p css={{ color: colors.error }}>
					{errorMessage} <a href="/login">Log in</a> to continue.
				</p>
			) : null}
			{status === 'ready' && kids.length === 0 ? (
				<section
					css={{
						padding: spacing.lg,
						border: `3px dashed ${colors.border}`,
						borderRadius: radius.xl,
						backgroundColor: colors.surface,
						display: 'grid',
						gap: spacing.sm,
					}}
				>
					<h2 css={{ margin: 0, color: colors.text }}>No kids yet</h2>
					<p css={{ margin: 0, color: colors.textMuted }}>
						Open <a href="/settings">Settings</a> to add your first kid and
						account.
					</p>
				</section>
			) : null}

			{kids.map((kid) => (
				<article
					key={kid.id}
					css={{
						display: 'grid',
						gap: spacing.md,
						padding: spacing.lg,
						borderRadius: radius.xl,
						border: `3px solid ${colors.border}`,
						backgroundColor: colors.surface,
						boxShadow: shadows.md,
					}}
				>
					<header
						css={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							gap: spacing.md,
						}}
					>
						<div>
							<h2 css={{ margin: 0, color: colors.text }}>
								{kid.emoji} {kid.name}
							</h2>
							<p css={{ margin: 0, color: colors.textMuted }}>
								Total: {formatCents(kid.totalBalanceCents)}
							</p>
						</div>
					</header>
					<div css={{ display: 'grid', gap: spacing.sm }}>
						{kid.accounts.length === 0 ? (
							<p css={{ margin: 0, color: colors.textMuted }}>
								No accounts yet. Add one in settings.
							</p>
						) : null}
						{kid.accounts.map((account) => (
							<button
								key={account.id}
								type="button"
								on={{
									click: (event) => {
										if (!(event.currentTarget instanceof HTMLButtonElement))
											return
										openTransactionModal(kid, account, event.currentTarget)
									},
								}}
								css={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center',
									gap: spacing.sm,
									padding: spacing.md,
									borderRadius: radius.lg,
									border: 'none',
									background: getAccountBackground(account.colorToken),
									color: '#ffffff',
									cursor: 'pointer',
									boxShadow: `0 4px 0 0 rgba(0,0,0,0.2)`,
									transition: `all ${transitions.fast}`,
									'&:hover': { filter: 'brightness(1.1)' },
									'&:active': {
										transform: 'translateY(4px)',
										boxShadow: '0 0 0 0 rgba(0,0,0,0.2)',
									},
								}}
							>
								<span
									css={{
										display: 'grid',
										gap: 2,
										textAlign: 'left',
										fontWeight: typography.fontWeight.semibold,
									}}
								>
									{account.name}
									<span
										css={{ fontSize: typography.fontSize.sm, opacity: 0.9 }}
									>
										Tap to add or remove money
									</span>
								</span>
								<strong css={{ fontSize: typography.fontSize.lg }}>
									{formatCents(account.balanceCents)}
								</strong>
							</button>
						))}
					</div>
				</article>
			))}

			{transactionState ? (
				<div
					css={{
						position: 'fixed',
						inset: 0,
						backgroundColor: 'rgba(0, 0, 0, 0.45)',
						display: 'grid',
						placeItems: 'center',
						padding: spacing.md,
						zIndex: 1000,
						pointerEvents: transactionModalClosing ? 'none' : 'auto',
						animation: transactionModalClosing
							? `modal-backdrop-out ${modalCloseAnimationDurationMs}ms ease-in forwards`
							: 'modal-backdrop-in 180ms ease-out forwards',
					}}
				>
					<section
						role="dialog"
						aria-modal="true"
						aria-labelledby="transaction-modal-title"
						aria-describedby="transaction-modal-description"
						on={{ keydown: handleTransactionModalKeydown }}
						css={{
							width: 'min(30rem, 100%)',
							display: 'grid',
							gap: spacing.md,
							padding: spacing.lg,
							borderRadius: radius.xl,
							border: `3px solid ${colors.border}`,
							backgroundColor: colors.surface,
							boxShadow: shadows.lg,
							animation: transactionModalClosing
								? `modal-close ${modalCloseAnimationDurationMs}ms ease-in forwards`
								: 'modal-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
						}}
					>
						<header css={{ display: 'flex', justifyContent: 'space-between' }}>
							<div>
								<h3
									id="transaction-modal-title"
									css={{ margin: 0, color: colors.text }}
								>
									{transactionState.kid.emoji} {transactionState.kid.name}
								</h3>
								<p
									id="transaction-modal-description"
									css={{ margin: 0, color: colors.textMuted }}
								>
									{transactionState.account.name} ·{' '}
									{formatCents(transactionState.account.balanceCents)}
								</p>
							</div>
							<button
								id="transaction-modal-close"
								type="button"
								on={{ click: closeTransactionModal }}
								css={{
									border: 'none',
									background: 'transparent',
									color: colors.textMuted,
									cursor: 'pointer',
								}}
							>
								Close
							</button>
						</header>

						<label css={{ display: 'grid', gap: spacing.xs }}>
							<span css={{ color: colors.text }}>Amount</span>
							<input
								type="number"
								min="0"
								step="0.01"
								value={transactionState.amount}
								on={{
									input: (event) => {
										if (!(event.currentTarget instanceof HTMLInputElement))
											return
										transactionState!.amount = event.currentTarget.value
										transactionState!.error = null
										handle.update()
									},
								}}
								css={inputCss}
							/>
						</label>

						<div css={{ display: 'grid', gap: spacing.xs }}>
							<span
								css={{
									color: colors.textMuted,
									fontSize: typography.fontSize.sm,
								}}
							>
								Quick amounts
							</span>
							<div
								css={{
									display: 'grid',
									gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
									gap: spacing.xs,
								}}
							>
								{quickAmounts.map((amount) => (
									<button
										key={amount}
										type="button"
										on={{ click: () => setTransactionAmountFromQuick(amount) }}
										css={{
											...buttonCss,
											backgroundColor: colors.surface,
											color: colors.text,
											border: `2px solid ${colors.border}`,
											boxShadow: `0 2px 0 0 ${colors.border}`,
											'&:active': {
												transform: 'translateY(2px)',
												boxShadow: `0 0 0 0 ${colors.border}`,
											},
										}}
									>
										{formatCents(amount)}
									</button>
								))}
							</div>
						</div>

						<label css={{ display: 'grid', gap: spacing.xs }}>
							<span css={{ color: colors.text }}>Note (optional)</span>
							<input
								type="text"
								value={transactionState.note}
								on={{
									input: (event) => {
										if (!(event.currentTarget instanceof HTMLInputElement))
											return
										transactionState!.note = event.currentTarget.value
										handle.update()
									},
								}}
								css={inputCss}
							/>
						</label>

						{transactionState.error ? (
							<p css={{ margin: 0, color: colors.error }}>
								{transactionState.error}
							</p>
						) : null}
						{transactionState.warning ? (
							<p css={{ margin: 0, color: '#b45309' }}>
								{transactionState.warning}
							</p>
						) : null}

						<div
							css={{
								display: 'grid',
								gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
								gap: spacing.sm,
							}}
						>
							<button
								type="button"
								on={{ click: closeTransactionModal }}
								css={{
									...modalButtonCss(colors.surface, colors.text, colors.border),
									border: `2px solid ${colors.border}`,
								}}
							>
								Cancel
							</button>
							<button
								type="button"
								disabled={transactionState.status === 'saving'}
								on={{ click: () => void submitTransaction('add') }}
								css={modalButtonCss('#86efac', '#052e16', '#16a34a')}
							>
								Add
							</button>
							<button
								type="button"
								disabled={transactionState.status === 'saving'}
								on={{ click: () => void submitTransaction('remove') }}
								css={modalButtonCss('#fecaca', '#450a0a', '#dc2626')}
							>
								Remove
							</button>
						</div>
					</section>
				</div>
			) : null}
		</section>
	)
}

export const Component = HomeRoute

export function getMetadata() {
	return { title: null }
}

function modalButtonCss(
	background: string,
	color: string,
	activeShadow: string,
) {
	return {
		...buttonCss,
		background,
		color,
		boxShadow: `0 4px 0 0 ${activeShadow}`,
		'&:active': {
			transform: 'translateY(4px)',
			boxShadow: `0 0 0 0 ${activeShadow}`,
		},
	}
}
